export type GarbageSource = "enemy" | "relic" | "debug";

export type GarbagePacket = {
  id: string;
  lines: number;
  remainingMs: number;
  initialDelayMs: number;
  source: GarbageSource;
};

export type LegacyGarbagePacket = Omit<Partial<GarbagePacket>, "source"> & {
  amount?: number;
  source?: string;
  createdAtMs?: number;
  readyAtMs?: number;
  remainingDelay?: number;
};

export type GarbageQueueConfig = {
  entryDelayMs?: number;
};

export type GarbageCancelResult = {
  queue: GarbageQueue;
  cancelledGarbage: number;
  remainingAttack: number;
  originalAttackDamage: number;
  attackUsedForCancel: number;
  remainingAttackDamage: number;
  remainingGarbageAmount: number;
};

export type GarbagePreviewModel = {
  totalAmount: number;
  readyAmount: number;
  pendingGarbageLines: number;
  readyGarbageLines: number;
  packets: Array<{
    lines: number;
    remainingMs: number;
    initialDelayMs: number;
    source: GarbageSource;
  }>;
};

export class GarbageQueue {
  private readonly packets: GarbagePacket[];
  private readonly nextId: number;

  constructor(
    private readonly config: GarbageQueueConfig = {},
    packets: LegacyGarbagePacket[] = [],
    nextId?: number,
  ) {
    this.packets = packets.map((packet) => normalizePacket(packet)).filter((packet) => packet.lines > 0);
    this.nextId = nextId ?? nextPacketId(this.packets);
  }

  enqueue(lines: number, travelDelayMsOrSource: number | string = this.config.entryDelayMs ?? 0, sourceOrNow: GarbageSource | number = "enemy"): GarbageQueue {
    const safeLines = Math.floor(lines);
    if (safeLines <= 0) return this;

    const travelDelayMs = typeof travelDelayMsOrSource === "number" ? travelDelayMsOrSource : this.config.entryDelayMs ?? 0;
    const packetSource = typeof travelDelayMsOrSource === "string" ? normalizeSource(travelDelayMsOrSource) : normalizeSource(String(sourceOrNow));
    const safeDelay = sanitizeMs(travelDelayMs);
    const packet: GarbagePacket = {
      id: `garbage_${this.nextId}`,
      lines: safeLines,
      remainingMs: safeDelay,
      initialDelayMs: safeDelay,
      source: packetSource,
    };

    return new GarbageQueue(this.config, [...this.packets, packet], this.nextId + 1);
  }

  tick(deltaMs: number): GarbageQueue {
    const safeDelta = sanitizeMs(deltaMs);
    if (safeDelta <= 0) return this;
    return new GarbageQueue(
      this.config,
      this.packets.map((packet) => ({ ...packet, remainingMs: packet.remainingMs - safeDelta })),
      this.nextId,
    );
  }

  getReadyLines(): number {
    return this.packets.filter(isReady).reduce((total, packet) => total + packet.lines, 0);
  }

  getPendingLines(): number {
    return this.packets.reduce((total, packet) => total + packet.lines, 0);
  }

  getTotalAmount(): number {
    return this.getPendingLines();
  }

  getPackets(): GarbagePacket[] {
    return this.packets.map((packet) => ({ ...packet }));
  }

  getPreview(_nowMs?: number): GarbagePreviewModel {
    const pendingGarbageLines = this.getPendingLines();
    const readyGarbageLines = this.getReadyLines();
    return {
      totalAmount: pendingGarbageLines,
      readyAmount: readyGarbageLines,
      pendingGarbageLines,
      readyGarbageLines,
      packets: this.packets.map((packet) => ({
        lines: packet.lines,
        remainingMs: packet.remainingMs,
        initialDelayMs: packet.initialDelayMs,
        source: packet.source,
      })),
    };
  }

  tickDelay(): void {
    // Deprecated compatibility shim. Garbage travel now ticks through tick(deltaMs).
  }

  popReadyPackets(_nowMs?: number): GarbagePacket[] {
    return this.packets.filter(isReady).map((packet) => ({ ...packet }));
  }

  popReadyLines(maxLines: number, _nowMs?: number): { queue: GarbageQueue; linesToApply: number; packets: GarbagePacket[] } {
    let remainingLinesToPop = Math.max(0, Math.floor(maxLines));
    if (remainingLinesToPop <= 0) return { queue: this, linesToApply: 0, packets: [] };

    let linesToApply = 0;
    const nextPackets: GarbagePacket[] = [];
    const poppedPackets: GarbagePacket[] = [];

    for (const packet of this.packets) {
      if (!isReady(packet) || remainingLinesToPop <= 0) {
        nextPackets.push(packet);
        continue;
      }

      const poppedLines = Math.min(packet.lines, remainingLinesToPop);
      linesToApply += poppedLines;
      remainingLinesToPop -= poppedLines;
      poppedPackets.push({ ...packet, lines: poppedLines });

      const remainingPacketLines = packet.lines - poppedLines;
      if (remainingPacketLines > 0) {
        nextPackets.push({ ...packet, lines: remainingPacketLines });
      }
    }

    return {
      queue: new GarbageQueue(this.config, nextPackets, this.nextId),
      linesToApply,
      packets: poppedPackets,
    };
  }

  cancelWithAttack(attackLines: number): GarbageCancelResult {
    const originalAttackDamage = attackLines;
    let remainingAttack = Math.max(0, Math.floor(attackLines));
    if (remainingAttack <= 0) {
      return {
        queue: this,
        cancelledGarbage: 0,
        remainingAttack: 0,
        originalAttackDamage,
        attackUsedForCancel: 0,
        remainingAttackDamage: 0,
        remainingGarbageAmount: this.getPendingLines(),
      };
    }

    let cancelledGarbage = 0;
    const nextPackets: GarbagePacket[] = [];
    const orderedPackets = [...this.packets].sort(cancelPriority);

    for (const packet of orderedPackets) {
      if (remainingAttack <= 0) {
        nextPackets.push(packet);
        continue;
      }

      const cancelLines = Math.min(packet.lines, remainingAttack);
      cancelledGarbage += cancelLines;
      remainingAttack -= cancelLines;

      const remainingPacketLines = packet.lines - cancelLines;
      if (remainingPacketLines > 0) {
        nextPackets.push({ ...packet, lines: remainingPacketLines });
      }
    }

    const queue = new GarbageQueue(this.config, restoreOriginalOrder(nextPackets, this.packets), this.nextId);
    return {
      queue,
      cancelledGarbage,
      remainingAttack,
      originalAttackDamage,
      attackUsedForCancel: cancelledGarbage,
      remainingAttackDamage: remainingAttack,
      remainingGarbageAmount: queue.getPendingLines(),
    };
  }

  clear(): GarbageQueue {
    return new GarbageQueue(this.config, [], this.nextId);
  }
}

function nextPacketId(packets: GarbagePacket[]): number {
  const highestId = packets.reduce((highest, packet) => {
    const match = /^garbage_(\d+)$/.exec(packet.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return highestId + 1;
}

function normalizePacket(packet: LegacyGarbagePacket): GarbagePacket {
  const readyAtMs = typeof packet.readyAtMs === "number" ? packet.readyAtMs : undefined;
  const createdAtMs = typeof packet.createdAtMs === "number" ? packet.createdAtMs : 0;
  const legacyRemainingMs =
    typeof packet.remainingDelay === "number"
      ? packet.remainingDelay
      : readyAtMs === undefined
        ? undefined
        : readyAtMs - createdAtMs;
  const initialDelayMs = sanitizeMs(packet.initialDelayMs ?? legacyRemainingMs ?? 0);
  const remainingMs = sanitizeFiniteMs(packet.remainingMs ?? legacyRemainingMs ?? initialDelayMs);
  return {
    id: typeof packet.id === "string" ? packet.id : "garbage_1",
    lines: Math.max(0, Math.floor(packet.lines ?? packet.amount ?? 0)),
    remainingMs,
    initialDelayMs,
    source: normalizeSource(packet.source),
  };
}

function normalizeSource(source: string | undefined): GarbageSource {
  return source === "relic" || source === "debug" ? source : "enemy";
}

function sanitizeMs(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function sanitizeFiniteMs(value: number): number {
  if (value === Number.POSITIVE_INFINITY) return Number.POSITIVE_INFINITY;
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function isReady(packet: GarbagePacket): boolean {
  return packet.remainingMs <= 0;
}

function cancelPriority(left: GarbagePacket, right: GarbagePacket): number {
  if (isReady(left) !== isReady(right)) return isReady(left) ? -1 : 1;
  return left.remainingMs - right.remainingMs;
}

function restoreOriginalOrder(packets: GarbagePacket[], originalPackets: GarbagePacket[]): GarbagePacket[] {
  const byId = new Map(packets.map((packet) => [packet.id, packet]));
  return originalPackets.flatMap((packet) => {
    const nextPacket = byId.get(packet.id);
    return nextPacket ? [nextPacket] : [];
  });
}
