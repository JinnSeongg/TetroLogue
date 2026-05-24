import { describe, expect, it } from "vitest";
import { createActionName, createAttackTags, createBaseAttackResult, lineClearNameFor } from "../domain/combat/attack/AttackResultFactory";
import { noSpinResult, type SpinResult } from "../domain/tetris/SpinDetector";

describe("AttackResultFactory", () => {
  it.each([
    [0, "None"],
    [1, "Single"],
    [2, "Double"],
    [3, "Triple"],
    [4, "Tetris"],
  ])("creates actionName for %i line clears", (lineClearCount, expected) => {
    expect(createActionName(lineClearCount, noSpinResult())).toBe(expected);
  });

  it.each([
    [1, "Single"],
    [2, "Double"],
    [3, "Triple"],
    [4, "Tetris"],
  ])("creates lineClearName for %i line clears", (lineClearCount, expected) => {
    expect(lineClearNameFor(lineClearCount)).toBe(expected);
  });

  it("creates T-spin action names", () => {
    expect(createActionName(1, tSpin("Mini"))).toBe("T-spin Mini Single");
    expect(createActionName(1, tSpin("Full"))).toBe("T-spin Single");
    expect(createActionName(2, tSpin("Full"))).toBe("T-spin Double");
    expect(createActionName(3, tSpin("Full"))).toBe("T-spin Triple");
  });

  it("creates piece-specific All-spin action names", () => {
    expect(createActionName(1, allSpin("L"))).toBe("L-spin Single");
    expect(createActionName(2, allSpin("J"))).toBe("J-spin Double");
    expect(createActionName(3, allSpin("S"))).toBe("S-spin Triple");
    expect(createActionName(4, allSpin("I"))).toBe("I-spin Quad");
  });

  it("appends Perfect Clear to action names", () => {
    expect(createActionName(4, noSpinResult(), true)).toBe("Tetris Perfect Clear");
    expect(createActionName(2, tSpin("Full"), true)).toBe("T-spin Double Perfect Clear");
    expect(createActionName(2, allSpin("L"), true)).toBe("L-spin Double Perfect Clear");
  });

  it("creates tags for line clears, spins, and perfect clears", () => {
    expect(createAttackTags({ lineClearCount: 4, spinResult: noSpinResult() })).toEqual(["LineClear", "Tetris"]);
    expect(createAttackTags({ lineClearCount: 1, spinResult: tSpin("Mini") })).toEqual(["LineClear", "Single", "Spin", "TSpin", "TSpinMini"]);
    expect(createAttackTags({ lineClearCount: 2, spinResult: allSpin("J") })).toEqual(["LineClear", "Double", "Spin", "AllSpin"]);
    expect(createAttackTags({ lineClearCount: 0, spinResult: noSpinResult(), isPerfectClear: true })).toEqual(["PerfectClear"]);
  });

  it("includes Combo and B2B tags when bonuses are present", () => {
    expect(createAttackTags({ lineClearCount: 1, spinResult: noSpinResult(), comboBonus: 1, b2bBonus: 1 })).toEqual([
      "LineClear",
      "Single",
      "Combo",
      "B2B",
    ]);
  });

  it("creates base AttackResult with default damage fields and summed totalDamage", () => {
    const result = createBaseAttackResult({
      lineClearCount: 2,
      spinResult: noSpinResult(),
      baseDamage: 1,
      comboBonus: 2,
      b2bBonus: 3,
      perfectClearBonus: 4,
    });

    expect(result.actionName).toBe("Double");
    expect(result.lineClearName).toBe("Double");
    expect(result.isPerfectClear).toBe(false);
    expect(result.totalDamage).toBe(10);
  });
});

function tSpin(grade: "Mini" | "Full"): SpinResult {
  return {
    kind: "TSpin",
    grade,
    pieceType: "T",
    method: "TCorner",
    rotationState: "0",
    kickIndex: 0,
  };
}

function allSpin(pieceType: "J" | "L" | "S" | "Z" | "I"): SpinResult {
  return {
    kind: "AllSpin",
    grade: "Full",
    pieceType,
    method: "Immobile",
    rotationState: "R",
    kickIndex: 0,
  };
}
