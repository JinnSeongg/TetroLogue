import { describe, expect, it } from "vitest";
import { GarbageQueue } from "../domain/combat/GarbageQueue";

describe("GarbageQueue", () => {
  it("stores one incoming garbage packet amount", () => {
    const queue = new GarbageQueue();

    queue.enqueue(3);

    expect(queue.getTotalAmount()).toBe(3);
  });

  it("sums multiple incoming garbage packet amounts", () => {
    const queue = new GarbageQueue();

    queue.enqueue(2);
    queue.enqueue(4);

    expect(queue.getTotalAmount()).toBe(6);
  });

  it("ignores zero amount garbage", () => {
    const queue = new GarbageQueue();

    queue.enqueue(0);

    expect(queue.getTotalAmount()).toBe(0);
    expect(queue.getPackets()).toEqual([]);
  });

  it("ignores negative amount garbage", () => {
    const queue = new GarbageQueue();

    queue.enqueue(-1);

    expect(queue.getTotalAmount()).toBe(0);
    expect(queue.getPackets()).toEqual([]);
  });

  it("clears all incoming garbage packets", () => {
    const queue = new GarbageQueue();
    queue.enqueue(2);
    queue.enqueue(4);

    queue.clear();

    expect(queue.getTotalAmount()).toBe(0);
  });

  it("returns the current packet list", () => {
    const queue = new GarbageQueue({ defaultDelay: 2 });

    queue.enqueue(3, "enemy_attack");
    queue.enqueue(1, "boss_attack");

    expect(queue.getPackets()).toEqual([
      { id: "garbage_1", amount: 3, source: "enemy_attack", remainingDelay: 2 },
      { id: "garbage_2", amount: 1, source: "boss_attack", remainingDelay: 2 },
    ]);
  });

  it("partially cancels incoming garbage when attack is smaller", () => {
    const queue = new GarbageQueue();
    queue.enqueue(5);

    const result = queue.cancelWithAttack(3);

    expect(result).toEqual({
      originalAttackDamage: 3,
      cancelledGarbage: 3,
      attackUsedForCancel: 3,
      remainingAttackDamage: 0,
      remainingGarbageAmount: 2,
    });
    expect(queue.getTotalAmount()).toBe(2);
  });

  it("returns remaining attack damage when attack is larger than incoming garbage", () => {
    const queue = new GarbageQueue();
    queue.enqueue(3);

    const result = queue.cancelWithAttack(5);

    expect(result).toEqual({
      originalAttackDamage: 5,
      cancelledGarbage: 3,
      attackUsedForCancel: 3,
      remainingAttackDamage: 2,
      remainingGarbageAmount: 0,
    });
    expect(queue.getPackets()).toEqual([]);
  });

  it("keeps attack damage when there is no incoming garbage", () => {
    const queue = new GarbageQueue();

    const result = queue.cancelWithAttack(4);

    expect(result).toEqual({
      originalAttackDamage: 4,
      cancelledGarbage: 0,
      attackUsedForCancel: 0,
      remainingAttackDamage: 4,
      remainingGarbageAmount: 0,
    });
  });

  it("does not cancel garbage when attack damage is zero", () => {
    const queue = new GarbageQueue();
    queue.enqueue(5);

    const result = queue.cancelWithAttack(0);

    expect(result).toEqual({
      originalAttackDamage: 0,
      cancelledGarbage: 0,
      attackUsedForCancel: 0,
      remainingAttackDamage: 0,
      remainingGarbageAmount: 5,
    });
    expect(queue.getTotalAmount()).toBe(5);
  });

  it("cancels from the front packet first", () => {
    const queue = new GarbageQueue();
    queue.enqueue(2);
    queue.enqueue(4);

    const result = queue.cancelWithAttack(3);

    expect(result.remainingGarbageAmount).toBe(3);
    expect(result.remainingAttackDamage).toBe(0);
    expect(queue.getPackets()).toEqual([{ id: "garbage_2", amount: 3, source: "enemy", remainingDelay: 0 }]);
  });

  it("empties multiple packets and returns leftover attack damage", () => {
    const queue = new GarbageQueue();
    queue.enqueue(2);
    queue.enqueue(4);

    const result = queue.cancelWithAttack(10);

    expect(result).toEqual({
      originalAttackDamage: 10,
      cancelledGarbage: 6,
      attackUsedForCancel: 6,
      remainingAttackDamage: 4,
      remainingGarbageAmount: 0,
    });
    expect(queue.getPackets()).toEqual([]);
  });

  it("does not make a delay 2 packet ready after one tick", () => {
    const queue = new GarbageQueue({ defaultDelay: 2 });
    queue.enqueue(3);

    queue.tickDelay();

    expect(queue.popReadyPackets()).toEqual([]);
    expect(queue.getPackets()).toEqual([{ id: "garbage_1", amount: 3, source: "enemy", remainingDelay: 1 }]);
  });

  it("makes a delay 2 packet ready after two ticks", () => {
    const queue = new GarbageQueue({ defaultDelay: 2 });
    queue.enqueue(3);

    queue.tickDelay();
    queue.tickDelay();

    expect(queue.popReadyPackets()).toEqual([{ id: "garbage_1", amount: 3, source: "enemy", remainingDelay: 0 }]);
  });

  it("removes ready packets from the queue when popped", () => {
    const queue = new GarbageQueue({ defaultDelay: 1 });
    queue.enqueue(3);

    queue.tickDelay();
    queue.popReadyPackets();

    expect(queue.getPackets()).toEqual([]);
  });

  it("returns only ready packets when delays differ", () => {
    const queue = new GarbageQueue(
      { defaultDelay: 2 },
      [
        { id: "garbage_1", amount: 2, source: "fast", remainingDelay: 0 },
        { id: "garbage_2", amount: 4, source: "slow", remainingDelay: 2 },
      ],
    );

    expect(queue.popReadyPackets()).toEqual([{ id: "garbage_1", amount: 2, source: "fast", remainingDelay: 0 }]);
    expect(queue.getPackets()).toEqual([{ id: "garbage_2", amount: 4, source: "slow", remainingDelay: 2 }]);
  });

  it("does not return cancelled packets as ready", () => {
    const queue = new GarbageQueue({ defaultDelay: 1 });
    queue.enqueue(5);

    queue.cancelWithAttack(5);
    queue.tickDelay();

    expect(queue.popReadyPackets()).toEqual([]);
    expect(queue.getPackets()).toEqual([]);
  });

  it("previews the total amount for multiple packets", () => {
    const queue = new GarbageQueue();
    queue.enqueue(3);
    queue.enqueue(2);

    expect(queue.getPreview().totalAmount).toBe(5);
  });

  it("includes only delay 0 packets in ready amount", () => {
    const queue = new GarbageQueue(
      {},
      [
        { id: "garbage_1", amount: 3, source: "ready", remainingDelay: 0 },
        { id: "garbage_2", amount: 2, source: "waiting", remainingDelay: 1 },
      ],
    );

    expect(queue.getPreview()).toEqual({
      totalAmount: 5,
      readyAmount: 3,
      packets: [
        { amount: 3, remainingDelay: 0, source: "ready" },
        { amount: 2, remainingDelay: 1, source: "waiting" },
      ],
    });
  });

  it("does not mutate queue state when previewed", () => {
    const queue = new GarbageQueue({ defaultDelay: 2 });
    queue.enqueue(3, "enemy_attack");
    const before = queue.getPackets();

    queue.getPreview();

    expect(queue.getPackets()).toEqual(before);
  });

  it("previews reduced total amount after cancel", () => {
    const queue = new GarbageQueue();
    queue.enqueue(5);

    queue.cancelWithAttack(2);

    expect(queue.getPreview().totalAmount).toBe(3);
  });

  it("removes popped ready packets from preview", () => {
    const queue = new GarbageQueue(
      {},
      [
        { id: "garbage_1", amount: 3, source: "ready", remainingDelay: 0 },
        { id: "garbage_2", amount: 2, source: "waiting", remainingDelay: 1 },
      ],
    );

    queue.popReadyPackets();

    expect(queue.getPreview()).toEqual({
      totalAmount: 2,
      readyAmount: 0,
      packets: [{ amount: 2, remainingDelay: 1, source: "waiting" }],
    });
  });
});
