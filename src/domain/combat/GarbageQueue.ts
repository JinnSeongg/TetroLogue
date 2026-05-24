export type GarbagePacket = {
  id: string;
  amount: number;
  source: string;
  remainingDelay: number;
};

export type GarbageQueueConfig = {
  defaultDelay?: number;
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
    remainingDelay: number;
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
    this.packets = packets.map((packet) => ({ ...packet }));
    this.nextId = nextPacketId(this.packets);
  }

  enqueue(amount: number, source = "enemy"): GarbagePacket | undefined {
    if (amount <= 0) return undefined;

    const packet: GarbagePacket = {
      id: `garbage_${this.nextId++}`,
      amount,
      source,
      remainingDelay: this.config.defaultDelay ?? 0,
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

  getPreview(): GarbagePreviewModel {
    return {
      totalAmount: this.getTotalAmount(),
      readyAmount: this.packets
        .filter((packet) => packet.remainingDelay <= 0)
        .reduce((total, packet) => total + packet.amount, 0),
      packets: this.packets.map((packet) => ({
        amount: packet.amount,
        remainingDelay: packet.remainingDelay,
        source: packet.source,
      })),
    };
  }

  tickDelay(): void {
    for (const packet of this.packets) {
      packet.remainingDelay -= 1;
    }
  }

  popReadyPackets(): GarbagePacket[] {
    const readyPackets = this.packets.filter((packet) => packet.remainingDelay <= 0);
    const delayedPackets = this.packets.filter((packet) => packet.remainingDelay > 0);

    this.packets.length = 0;
    this.packets.push(...delayedPackets);

    return readyPackets.map((packet) => ({ ...packet }));
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
