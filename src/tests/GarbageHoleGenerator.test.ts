import { describe, expect, it } from "vitest";
import type { AttackResult } from "../domain/combat/AttackTypes";
import type { GarbageBlockingContext, GarbageBlockingRule } from "../domain/combat/GarbageBlockingRule";
import { GarbageHoleGenerator } from "../domain/combat/GarbageHoleGenerator";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

class SequenceRandomProvider implements RandomProvider {
  constructor(
    private readonly values: number[],
    private index = 0,
  ) {}

  next(): number {
    const value = this.values[this.index] ?? 0;
    this.index += 1;
    return value;
  }

  nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  shuffle<T>(items: T[]): T[] {
    return items;
  }
}

describe("GarbageHoleGenerator", () => {
  it("keeps the same hole column for Fixed pattern", () => {
    const generator = new GarbageHoleGenerator({ type: "Fixed", holeColumn: 4 }, new SeededRandomProvider(61));

    expect([generator.nextHole(10), generator.nextHole(10), generator.nextHole(10)]).toEqual([4, 4, 4]);
  });

  it("returns only valid columns for Random pattern", () => {
    const generator = new GarbageHoleGenerator({ type: "Random" }, new SeededRandomProvider(62));

    const holes = Array.from({ length: 20 }, () => generator.nextHole(10));

    expect(holes.every((hole) => hole >= 0 && hole < 10)).toBe(true);
  });

  it("keeps the hole when LimitedRandom changeChance is 0", () => {
    const generator = new GarbageHoleGenerator({ type: "LimitedRandom", changeChance: 0, initialHoleColumn: 3 }, new SeededRandomProvider(63));

    expect([generator.nextHole(10), generator.nextHole(10), generator.nextHole(10)]).toEqual([3, 3, 3]);
  });

  it("changes the hole when LimitedRandom changeChance is 1", () => {
    const generator = new GarbageHoleGenerator(
      { type: "LimitedRandom", changeChance: 1, initialHoleColumn: 3 },
      new SequenceRandomProvider([0, 0]),
    );

    const first = generator.nextHole(10);
    const second = generator.nextHole(10);

    expect(first).toBe(3);
    expect(second).not.toBe(first);
    expect(second).toBeGreaterThanOrEqual(0);
    expect(second).toBeLessThan(10);
  });

  it("clamps Fixed hole columns to the board width", () => {
    const generator = new GarbageHoleGenerator({ type: "Fixed", holeColumn: 99 }, new SeededRandomProvider(64));

    expect(generator.nextHole(10)).toBe(9);
  });

  it("allows blocking rules to inspect AttackResult context", () => {
    const rule: GarbageBlockingRule = {
      canApply: (context: GarbageBlockingContext) => context.attackResult?.tags.includes("TSpin") ?? false,
      modifyIncomingGarbage: (context: GarbageBlockingContext) => Math.max(0, context.incomingGarbageAmount - 2),
    };
    const context: GarbageBlockingContext = {
      incomingGarbageAmount: 4,
      attackTags: ["TSpin"],
      attackResult: { tags: ["TSpin"] } as AttackResult,
    };

    expect(rule.canApply(context)).toBe(true);
    expect(rule.modifyIncomingGarbage(context)).toBe(2);
  });
});
