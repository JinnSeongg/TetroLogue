import { describe, expect, it } from "vitest";
import { GarbageQueue } from "../domain/combat/GarbageQueue";

describe("GarbageQueue", () => {
  it("stores one incoming garbage packet", () => {
    const queue = new GarbageQueue().enqueue(3, 2500, "enemy");

    expect(queue.getPendingLines()).toBe(3);
  });

  it("ignores non-positive garbage lines", () => {
    const queue = new GarbageQueue().enqueue(0).enqueue(-1);

    expect(queue.getPendingLines()).toBe(0);
    expect(queue.getPackets()).toEqual([]);
  });

  it("records remainingMs and initialDelayMs when enqueued", () => {
    const queue = new GarbageQueue().enqueue(3, 2500, "enemy");

    expect(queue.getPackets()).toEqual([
      { id: "garbage_1", lines: 3, source: "enemy", remainingMs: 2500, initialDelayMs: 2500 },
    ]);
  });

  it("does not mark a packet ready immediately after enqueue", () => {
    const queue = new GarbageQueue().enqueue(3, 2500, "enemy");

    expect(queue.getPreview()).toMatchObject({
      totalAmount: 3,
      readyAmount: 0,
      pendingGarbageLines: 3,
      readyGarbageLines: 0,
    });
  });

  it("marks a packet ready after ticking through travel delay", () => {
    const queue = new GarbageQueue().enqueue(3, 2500, "enemy").tick(2499);

    expect(queue.getReadyLines()).toBe(0);
    expect(queue.tick(1).getReadyLines()).toBe(3);
  });

  it("returns ready packets without removing them", () => {
    const queue = new GarbageQueue().enqueue(3, 2500, "enemy").tick(2500);

    expect(queue.popReadyPackets()).toEqual([
      { id: "garbage_1", lines: 3, source: "enemy", remainingMs: 0, initialDelayMs: 2500 },
    ]);
    expect(queue.getPendingLines()).toBe(3);
  });

  it("cancels ready garbage before incoming garbage", () => {
    const queue = new GarbageQueue(
      {},
      [
        { id: "garbage_1", lines: 2, source: "enemy", remainingMs: 1200, initialDelayMs: 2500 },
        { id: "garbage_2", lines: 2, source: "enemy", remainingMs: 0, initialDelayMs: 2500 },
      ],
    );

    const result = queue.cancelWithAttack(3);

    expect(result.cancelledGarbage).toBe(3);
    expect(result.remainingAttack).toBe(0);
    expect(result.queue.getPackets()).toEqual([
      { id: "garbage_1", lines: 1, source: "enemy", remainingMs: 1200, initialDelayMs: 2500 },
    ]);
  });

  it("cancels incoming garbage with the shortest remaining time first", () => {
    const queue = new GarbageQueue(
      {},
      [
        { id: "garbage_1", lines: 2, source: "enemy", remainingMs: 2000, initialDelayMs: 2500 },
        { id: "garbage_2", lines: 4, source: "enemy", remainingMs: 500, initialDelayMs: 2500 },
      ],
    );

    const result = queue.cancelWithAttack(3);

    expect(result.remainingGarbageAmount).toBe(3);
    expect(result.queue.getPackets()).toEqual([
      { id: "garbage_1", lines: 2, source: "enemy", remainingMs: 2000, initialDelayMs: 2500 },
      { id: "garbage_2", lines: 1, source: "enemy", remainingMs: 500, initialDelayMs: 2500 },
    ]);
  });

  it("returns remaining attack when attack is larger than queued garbage", () => {
    const queue = new GarbageQueue().enqueue(3, 2500, "enemy");

    const result = queue.cancelWithAttack(5);

    expect(result.remainingAttack).toBe(2);
    expect(result.cancelledGarbage).toBe(3);
    expect(result.queue.getPackets()).toEqual([]);
  });

  it("pops only the requested number of ready lines", () => {
    const queue = new GarbageQueue(
      {},
      [
        { id: "garbage_1", lines: 3, source: "enemy", remainingMs: 0, initialDelayMs: 0 },
        { id: "garbage_2", lines: 4, source: "enemy", remainingMs: 0, initialDelayMs: 0 },
      ],
    );

    const result = queue.popReadyLines(4);

    expect(result.linesToApply).toBe(4);
    expect(result.packets).toEqual([
      { id: "garbage_1", lines: 3, source: "enemy", remainingMs: 0, initialDelayMs: 0 },
      { id: "garbage_2", lines: 1, source: "enemy", remainingMs: 0, initialDelayMs: 0 },
    ]);
    expect(result.queue.getPackets()).toEqual([
      { id: "garbage_2", lines: 3, source: "enemy", remainingMs: 0, initialDelayMs: 0 },
    ]);
  });

  it("does not pop incoming lines when chunking ready garbage", () => {
    const queue = new GarbageQueue(
      {},
      [
        { id: "garbage_1", lines: 2, source: "enemy", remainingMs: 1500, initialDelayMs: 2500 },
        { id: "garbage_2", lines: 3, source: "enemy", remainingMs: 0, initialDelayMs: 0 },
      ],
    );

    const result = queue.popReadyLines(4);

    expect(result.linesToApply).toBe(3);
    expect(result.queue.getPackets()).toEqual([
      { id: "garbage_1", lines: 2, source: "enemy", remainingMs: 1500, initialDelayMs: 2500 },
    ]);
  });

  it("normalizes legacy ready packets", () => {
    const queue = new GarbageQueue({}, [{ id: "garbage_1", amount: 2, source: "legacy", remainingDelay: 0 }]);

    expect(queue.getReadyLines()).toBe(2);
  });
});
