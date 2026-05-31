export type GarbagePacket = {
  id: string;
  amount: number;
  source: string;
  createdAtMs?: number;
  readyAtMs?: number;
  remainingDelay?: number;
};

export type GarbageQueueConfig = {
  entryDelayMs?: number;
};

export type GarbageCancelResult = {
  originalAttackDamage: number;
  cancelledGarbage: number;
  attackUsedForCancel: number;
  remainingAttackDamage: number;
  remainingGarbageAmount: number;
};

export type GarbagePreviewModel = {
  totalAmount: number;
  readyAmount: number;
  packets: Array<{
    amount: number;
    readyAtMs: number;
    source: string;
  }>;
};

export class GarbageQueue {
  private readonly packets: GarbagePacket[] = [];
  private nextId: number;

  constructor(
    private readonly config: GarbageQueueConfig = {},
    packets: GarbagePacket[] = [],
  ) {
    this.packets = packets.map((packet) => normalizePacket(packet));
    this.nextId = nextPacketId(this.packets);
  }

  enqueue(amount: number, source = "enemy", nowMs = 0): GarbagePacket | undefined {
    if (amount <= 0) return undefined;

    const packet: GarbagePacket = {
      id: `garbage_${this.nextId++}`,
      amount,
      source,
      createdAtMs: nowMs,
      readyAtMs: nowMs + (this.config.entryDelayMs ?? 0),
    };

    this.packets.push(packet);
    return { ...packet };
  }

  getTotalAmount(): number {
    return this.packets.reduce((total, packet) => total + packet.amount, 0);
  }

  getPackets(): GarbagePacket[] {
    return this.packets.map((packet) => ({ ...packet }));
  }

  getPreview(nowMs = 0): GarbagePreviewModel {
    return {
      totalAmount: this.getTotalAmount(),
      readyAmount: this.packets
        .filter((packet) => readyAt(packet) <= nowMs)
        .reduce((total, packet) => total + packet.amount, 0),
      packets: this.packets.map((packet) => ({
        amount: packet.amount,
        readyAtMs: readyAt(packet),
        source: packet.source,
      })),
    };
  }

  tickDelay(): void {
    // Kept for backwards compatibility; readiness is time-based.
  }

  popReadyPackets(nowMs = 0): GarbagePacket[] {
    const readyPackets = this.packets.filter((packet) => readyAt(packet) <= nowMs);
    const delayedPackets = this.packets.filter((packet) => readyAt(packet) > nowMs);

    this.packets.length = 0;
    this.packets.push(...delayedPackets);

    return readyPackets.map((packet) => ({ ...packet }));
  }

  popReadyLines(maxLines: number, nowMs = 0): GarbagePacket[] {
    let remainingLinesToPop = Math.max(0, Math.floor(maxLines));
    if (remainingLinesToPop <= 0) return [];

    const poppedPackets: GarbagePacket[] = [];

    for (let index = 0; index < this.packets.length && remainingLinesToPop > 0; ) {
      const packet = this.packets[index];
      if (readyAt(packet) > nowMs) {
        index += 1;
        continue;
      }

      const poppedAmount = Math.min(packet.amount, remainingLinesToPop);
      poppedPackets.push({ ...packet, amount: poppedAmount });
      packet.amount -= poppedAmount;
      remainingLinesToPop -= poppedAmount;

      if (packet.amount <= 0) {
        this.packets.splice(index, 1);
      } else {
        index += 1;
      }
    }

    return poppedPackets;
  }

  cancelWithAttack(attackDamage: number): GarbageCancelResult {
    const originalAttackDamage = attackDamage;
    if (attackDamage <= 0) {
      return {
        originalAttackDamage,
        cancelledGarbage: 0,
        attackUsedForCancel: 0,
        remainingAttackDamage: 0,
        remainingGarbageAmount: this.getTotalAmount(),
      };
    }

    let remainingCancelDamage = attackDamage;
    let cancelledGarbage = 0;

    while (remainingCancelDamage > 0 && this.packets.length > 0) {
      const packet = this.packets[0];
      const cancelAmount = Math.min(packet.amount, remainingCancelDamage);

      packet.amount -= cancelAmount;
      remainingCancelDamage -= cancelAmount;
      cancelledGarbage += cancelAmount;

      if (packet.amount === 0) {
        this.packets.shift();
      }
    }

    return {
      originalAttackDamage,
      cancelledGarbage,
      attackUsedForCancel: cancelledGarbage,
      remainingAttackDamage: remainingCancelDamage,
      remainingGarbageAmount: this.getTotalAmount(),
    };
  }

  clear(): void {
    this.packets.length = 0;
  }
}

function nextPacketId(packets: GarbagePacket[]): number {
  const highestId = packets.reduce((highest, packet) => {
    const match = /^garbage_(\d+)$/.exec(packet.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return highestId + 1;
}

function normalizePacket(packet: GarbagePacket): GarbagePacket {
  const createdAtMs = Number.isFinite(packet.createdAtMs) ? packet.createdAtMs : 0;
  const readyAtMs = Number.isFinite(packet.readyAtMs) ? packet.readyAtMs : legacyReadyAtMs(packet.remainingDelay);
  return {
    ...packet,
    createdAtMs,
    readyAtMs,
  };
}

function legacyReadyAtMs(remainingDelay: number | undefined): number {
  return typeof remainingDelay === "number" && remainingDelay > 0 ? Number.POSITIVE_INFINITY : 0;
}

function readyAt(packet: GarbagePacket): number {
  return packet.readyAtMs ?? 0;
}
