import { describe, expect, it } from "vitest";
import { AttackCalculator } from "../domain/combat/AttackCalculator";
import type { AttackCalculationInput } from "../domain/combat/AttackTypes";
import { noSpinResult, type SpinResult } from "../domain/tetris/SpinDetector";

describe("AttackCalculator", () => {
  it("maps 0-line normal attack to 0 totalDamage and resets combo", () => {
    const result = calculate({ lineClearCount: 0, comboBefore: 4 });

    expect(result.totalDamage).toBe(0);
    expect(result.comboAfter).toBe(0);
    expect(result.attackType).toBe("None");
  });

  it.each([
    [1, 0, "Single"],
    [2, 1, "Double"],
    [3, 2, "Triple"],
    [4, 4, "Tetris"],
  ])("maps normal %i-line clear to baseDamage %i", (lineClearCount, expectedDamage, actionName) => {
    const result = calculate({ lineClearCount });

    expect(result.baseDamage).toBe(expectedDamage);
    expect(result.actionName).toBe(actionName);
    expect(result.lineClearName).toBe(actionName);
  });

  it.each([
    [0, "Full", 0, "None"],
    [1, "Mini", 1, "T-spin Mini Single"],
    [1, "Full", 2, "T-spin Single"],
    [2, "Full", 4, "T-spin Double"],
    [3, "Full", 6, "T-spin Triple"],
  ] as const)("maps T-spin lineClearCount %i grade %s to baseDamage %i", (lineClearCount, grade, expectedDamage, actionName) => {
    const result = calculate({ lineClearCount, spinResult: tSpin(grade) });

    expect(result.baseDamage).toBe(expectedDamage);
    expect(result.actionName).toBe(actionName);
    expect(result.attackType).toBe("TSpin");
  });

  it.each([
    [1, "L", 1, "L-spin Single"],
    [2, "J", 2, "J-spin Double"],
    [3, "S", 3, "S-spin Triple"],
    [4, "I", 4, "I-spin Quad"],
  ] as const)("maps %s All-spin %i-line clear to baseDamage %i", (lineClearCount, pieceType, expectedDamage, actionName) => {
    const result = calculate({ lineClearCount, spinResult: allSpin(pieceType) });

    expect(result.baseDamage).toBe(expectedDamage);
    expect(result.actionName).toBe(actionName);
    expect(result.attackType).toBe("AllSpin");
  });

  it.each([
    [0, 1, 0],
    [1, 2, 1],
    [3, 4, 2],
    [5, 6, 3],
    [8, 9, 4],
  ])("applies comboBefore %i to comboAfter %i and comboBonus %i", (comboBefore, comboAfter, comboBonus) => {
    const result = calculate({ lineClearCount: 1, comboBefore });

    expect(result.comboAfter).toBe(comboAfter);
    expect(result.comboBonus).toBe(comboBonus);
  });

  it("does not apply combo bonus on 0-line actions", () => {
    const result = calculate({ lineClearCount: 0, comboBefore: 8, spinResult: tSpin("Full") });

    expect(result.comboAfter).toBe(0);
    expect(result.comboBonus).toBe(0);
  });

  it("applies B2B state transitions and bonus", () => {
    const firstTetris = calculate({ lineClearCount: 4, wasB2BActive: false });
    const chainedTetris = calculate({ lineClearCount: 4, wasB2BActive: true });
    const tSpinDouble = calculate({ lineClearCount: 2, spinResult: tSpin("Full"), wasB2BActive: true });
    const allSpinDouble = calculate({ lineClearCount: 2, spinResult: allSpin("J"), wasB2BActive: true });
    const allSpinSingle = calculate({ lineClearCount: 1, spinResult: allSpin("J"), wasB2BActive: true });
    const normalDouble = calculate({ lineClearCount: 2, wasB2BActive: true });
    const noClear = calculate({ lineClearCount: 0, wasB2BActive: true });

    expect(firstTetris.b2bBonus).toBe(0);
    expect(firstTetris.b2bAfter).toBe(true);
    expect(chainedTetris.b2bBonus).toBe(1);
    expect(chainedTetris.b2bAfter).toBe(true);
    expect(tSpinDouble.b2bBonus).toBe(1);
    expect(tSpinDouble.b2bAfter).toBe(true);
    expect(allSpinDouble.b2bBonus).toBe(1);
    expect(allSpinDouble.b2bAfter).toBe(true);
    expect(allSpinSingle.b2bBonus).toBe(0);
    expect(allSpinSingle.b2bAfter).toBe(false);
    expect(normalDouble.b2bBonus).toBe(0);
    expect(normalDouble.b2bAfter).toBe(false);
    expect(noClear.b2bAfter).toBe(true);
  });

  it("applies perfect clear bonus only when lines are cleared", () => {
    const tetris = calculate({ lineClearCount: 4, isPerfectClear: true });
    const single = calculate({ lineClearCount: 1, isPerfectClear: true });
    const noClear = calculate({ lineClearCount: 0, isPerfectClear: true });

    expect(tetris.perfectClearBonus).toBe(6);
    expect(single.perfectClearBonus).toBe(6);
    expect(noClear.perfectClearBonus).toBe(0);
    expect(tetris.tags).toContain("PerfectClear");
  });

  it("sums totalDamage from base damage and every bonus", () => {
    const tSpinDouble = calculate({ lineClearCount: 2, spinResult: tSpin("Full"), comboBefore: 1, wasB2BActive: true });
    const tetrisPerfectClear = calculate({ lineClearCount: 4, isPerfectClear: true });
    const allBonuses = calculate({ lineClearCount: 4, comboBefore: 8, wasB2BActive: true, isPerfectClear: true });

    expect(tSpinDouble.comboBonus).toBe(1);
    expect(tSpinDouble.b2bBonus).toBe(1);
    expect(tSpinDouble.totalDamage).toBe(6);
    expect(tetrisPerfectClear.totalDamage).toBe(10);
    expect(allBonuses.totalDamage).toBe(
      allBonuses.baseDamage + allBonuses.comboBonus + allBonuses.b2bBonus + allBonuses.perfectClearBonus,
    );
  });

  it("generates tags for spins, combo, B2B, and perfect clears", () => {
    const tSpinMini = calculate({ lineClearCount: 1, spinResult: tSpin("Mini") });
    const allSpinDouble = calculate({ lineClearCount: 2, spinResult: allSpin("L") });
    const b2bTetris = calculate({ lineClearCount: 4, wasB2BActive: true });
    const comboSingle = calculate({ lineClearCount: 1, comboBefore: 1 });
    const perfectClear = calculate({ lineClearCount: 4, isPerfectClear: true });

    expect(tSpinMini.tags).toEqual(["LineClear", "Single", "Spin", "TSpin", "TSpinMini"]);
    expect(allSpinDouble.tags).toEqual(["LineClear", "Double", "Spin", "AllSpin"]);
    expect(b2bTetris.tags).toContain("B2B");
    expect(comboSingle.tags).toContain("Combo");
    expect(perfectClear.tags).toContain("PerfectClear");
  });

  it("keeps Perfect Clear as a tag and bonus without replacing the attack type", () => {
    const result = calculate({ lineClearCount: 2, spinResult: tSpin("Full"), isPerfectClear: true });

    expect(result.attackType).toBe("TSpin");
    expect(result.actionName).toBe("T-spin Double Perfect Clear");
  });
});

function calculate(options: {
  lineClearCount: number;
  spinResult?: SpinResult;
  isPerfectClear?: boolean;
  comboBefore?: number;
  wasB2BActive?: boolean;
}) {
  const input: AttackCalculationInput = {
    lineClearCount: options.lineClearCount,
    spinResult: options.spinResult ?? noSpinResult(),
    isPerfectClear: options.isPerfectClear ?? false,
    comboBefore: options.comboBefore ?? 0,
    wasB2BActive: options.wasB2BActive ?? false,
  };
  return new AttackCalculator().calculate(input);
}

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
