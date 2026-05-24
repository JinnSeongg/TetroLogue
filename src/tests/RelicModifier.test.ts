import { describe, expect, it } from "vitest";
import { AttackCalculator } from "../domain/combat/AttackCalculator";
import { noSpinResult } from "../domain/tetris/SpinDetector";

describe("Relic modifiers", () => {
  it("does not apply relic effects in the base attack calculator", () => {
    const result = new AttackCalculator().calculate({
      lineClearCount: 4,
      spinResult: noSpinResult(),
      isPerfectClear: false,
      comboBefore: 0,
      wasB2BActive: false,
    });

    expect(result.totalDamage).toBe(4);
  });
});
