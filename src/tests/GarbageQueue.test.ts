import { describe, expect, it } from "vitest";
import { GarbageQueue } from "../domain/combat/GarbageQueue";

describe("GarbageQueue", () => {
  it("stores one incoming garbage packet amount", () => {
    const queue = new GarbageQueue();

    queue.enqueue(3, "enemy", 1000);

    expect(queue.getTotalAmount()).toBe(3);
  });

  it("ignores non-positive garbage amounts", () => {
    const queue = new GarbageQueue();

    queue.enqueue(0);
    queue.enqueue(-1);

    expect(queue.getTotalAmount()).toBe(0);
    expect(queue.getPackets()).toEqual([]);
  });

  it("records createdAtMs and readyAtMs when enqueued", () => {
    const queue = new GarbageQueue({ entryDelayMs: 2500 });

    queue.enqueue(3, "enemy_attack", 1000);

    expect(queue.getPackets()).toEqual([
      { id: "garbage_1", amount: 3, source: "enemy_attack", createdAtMs: 1000, readyAtMs: 3500 },
    ]);
  });

  it("does not mark a packet ready immediately after enqueue", () => {
    const queue = new GarbageQueue({ entryDelayMs: 2500 });

    queue.enqueue(3, "enemy", 1000);

    expect(queue.getPreview(1000)).toEqual({
      totalAmount: 3,
      readyAmount: 0,
      packets: [{ amount: 3, readyAtMs: 3500, source: "enemy" }],
    });
  });

  it("marks a packet ready when nowMs reaches readyAtMs", () => {
    const queue = new GarbageQueue({ entryDelayMs: 2500 });

    queue.enqueue(3, "enemy", 1000);

    expect(queue.getPreview(3000).readyAmount).toBe(0);
    expect(queue.getPreview(3500).readyAmount).toBe(3);
    expect(queue.getPreview(4000).readyAmount).toBe(3);
  });

  it("pops ready packets by time without ticking action delay", () => {
    const queue = new GarbageQueue({ entryDelayMs: 2500 });
    queue.enqueue(3, "enemy", 1000);

    expect(queue.popReadyPackets(3000)).toEqual([]);
    expect(queue.getTotalAmount()).toBe(3);
    expect(queue.popReadyPackets(3500)).toEqual([
      { id: "garbage_1", amount: 3, source: "enemy", createdAtMs: 1000, readyAtMs: 3500 },
    ]);
    expect(queue.getTotalAmount()).toBe(0);
  });

  it("cancels waiting garbage before attack reaches the enemy", () => {
    const queue = new GarbageQueue({ entryDelayMs: 2500 });
    queue.enqueue(5, "enemy", 1000);

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
    queue.enqueue(3, "enemy", 1000);

    const result = queue.cancelWithAttack(5);

    expect(result.remainingAttackDamage).toBe(2);
    expect(result.cancelledGarbage).toBe(3);
    expect(queue.getPackets()).toEqual([]);
  });

  it("cancels from the oldest packet first", () => {
    const queue = new GarbageQueue();
    queue.enqueue(2, "first", 1000);
    queue.enqueue(4, "second", 1100);

    const result = queue.cancelWithAttack(3);

    expect(result.remainingGarbageAmount).toBe(3);
    expect(result.remainingAttackDamage).toBe(0);
    expect(queue.getPackets()).toEqual([{ id: "garbage_2", amount: 3, source: "second", createdAtMs: 1100, readyAtMs: 1100 }]);
  });

  it("pops only the requested number of ready lines", () => {
    const queue = new GarbageQueue(
      {},
      [
        { id: "garbage_1", amount: 3, source: "ready_a", createdAtMs: 1000, readyAtMs: 1000 },
        { id: "garbage_2", amount: 4, source: "ready_b", createdAtMs: 1000, readyAtMs: 1000 },
      ],
    );

    expect(queue.popReadyLines(4, 1000)).toEqual([
      { id: "garbage_1", amount: 3, source: "ready_a", createdAtMs: 1000, readyAtMs: 1000 },
      { id: "garbage_2", amount: 1, source: "ready_b", createdAtMs: 1000, readyAtMs: 1000 },
    ]);
    expect(queue.getPackets()).toEqual([{ id: "garbage_2", amount: 3, source: "ready_b", createdAtMs: 1000, readyAtMs: 1000 }]);
  });

  it("does not pop waiting lines when chunking ready garbage", () => {
    const queue = new GarbageQueue(
      {},
      [
        { id: "garbage_1", amount: 2, source: "waiting", createdAtMs: 1000, readyAtMs: 3500 },
        { id: "garbage_2", amount: 3, source: "ready", createdAtMs: 1000, readyAtMs: 1000 },
      ],
    );

    expect(queue.popReadyLines(4, 2000)).toEqual([{ id: "garbage_2", amount: 3, source: "ready", createdAtMs: 1000, readyAtMs: 1000 }]);
    expect(queue.getPackets()).toEqual([{ id: "garbage_1", amount: 2, source: "waiting", createdAtMs: 1000, readyAtMs: 3500 }]);
  });

  it("normalizes legacy ready packets", () => {
    const queue = new GarbageQueue({}, [{ id: "garbage_1", amount: 2, source: "legacy", remainingDelay: 0 }]);

    expect(queue.getPreview(0).readyAmount).toBe(2);
  });
});
