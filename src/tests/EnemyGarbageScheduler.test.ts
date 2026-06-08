import { describe, expect, it } from "vitest";
import { EnemyGarbageScheduler } from "../domain/combat/garbage/EnemyGarbageScheduler";
import { GarbageQueue } from "../domain/combat/GarbageQueue";

describe("EnemyGarbageScheduler", () => {
  const pattern = {
    type: "fixedInterval" as const,
    lines: 1,
    intervalMs: 12000,
    travelDelayMs: 2500,
    initialDelayMs: 5000,
  };

  it("counts down to the next fixed interval attack", () => {
    const scheduler = new EnemyGarbageScheduler();

    const result = scheduler.tick(3000, pattern);

    expect(result.generatedPackets).toEqual([]);
    expect(result.scheduler.getNextAttackInfo(pattern)).toEqual({ lines: 1, remainingMs: 2000 });
  });

  it("generates enemy packets when the timer elapses", () => {
    const result = new EnemyGarbageScheduler().tick(5000, pattern);

    expect(result.generatedPackets).toEqual([{ lines: 1, travelDelayMs: 2500, source: "enemy" }]);
    expect(result.scheduler.getNextAttackInfo(pattern)).toEqual({ lines: 1, remainingMs: 12000 });
  });

  it("lets queue travel delay decide when generated garbage becomes ready", () => {
    const scheduled = new EnemyGarbageScheduler().tick(5000, pattern);
    const queue = scheduled.generatedPackets.reduce(
      (current, packet) => current.enqueue(packet.lines, packet.travelDelayMs, packet.source),
      new GarbageQueue(),
    );

    expect(queue.getReadyLines()).toBe(0);
    expect(queue.tick(2500).getReadyLines()).toBe(1);
  });
});
