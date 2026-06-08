import { describe, expect, it } from "vitest";
import { AttackCalculator } from "../domain/combat/AttackCalculator";
import { EffectResolver } from "../domain/relic/EffectResolver";
import { noSpinResult } from "../domain/tetris/SpinDetector";
import { relicDefinitions } from "../data/relicDefinitions";
import { GarbageQueue } from "../domain/combat/GarbageQueue";
import type { RelicDefinition } from "../domain/relic/RelicDefinition";
import { createBaseAttackResult } from "../domain/combat/attack/AttackResultFactory";

type TestAttackModifierFields = Omit<Extract<RelicDefinition["modifiers"][number], { trigger: "onAttackCalculated" }>, "trigger">;

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

  it("keeps attack modifier output unchanged when no relics are owned", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [], {
      linesCleared: 4,
      backToBackActive: false,
    });

    expect(result).toBe(4);
  });

  it("applies sample Tetris attack relics after base attack calculation", () => {
    const result = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, linesCleared: 4 }),
      [relicDefinitions.tetris_power, relicDefinitions.tetris_flat_bonus],
      {
        linesCleared: 4,
        backToBackActive: false,
      },
      { includeDetails: true },
    );

    expect(result.preRelicAttack).toBe(4);
    expect(result.attack).toBe(6);
    expect(result.attackResult?.typeBonus).toBe(0.25);
    expect(result.attackResult?.flatBonus).toBe(1);
    expect(result.relicAttackBonus).toBe(2);
    expect(result.appliedRelicIds).toEqual(["tetris_power", "tetris_flat_bonus"]);
  });

  it.each([
    ["tetris_power", relicDefinitions.tetris_power, { linesCleared: 4, backToBackActive: false, isTSpin: false }, 0.25, 28],
    ["tetris_overwhelm", relicDefinitions.tetris_overwhelm, { linesCleared: 4, backToBackActive: false, isTSpin: false }, 0.5, 30],
    ["spin_pierce", relicDefinitions.spin_pierce, { linesCleared: 2, backToBackActive: false, isTSpin: true }, 0.25, 28],
    ["tsd_tst_power", relicDefinitions.tsd_tst_power, { linesCleared: 2, backToBackActive: false, isTSpin: true }, 0.25, 28],
  ] as const)("applies %s as typeBonusAdd only to baseAttack", (_id, relic, context, expectedTypeBonus, expectedFinalDamage) => {
    const result = new EffectResolver().applyAttackModifiers(createReferenceAttackResult(), [relic], context, {
      includeDetails: true,
    });

    expectBucket(result.attackResult, {
      typeBonus: expectedTypeBonus,
      baseScaledDamage: expectedTypeBonus === 0.5 ? 15 : 13,
      finalDamage: expectedFinalDamage,
    });
    expect(result.attackResult?.comboScaledDamage).toBe(4);
    expect(result.attackResult?.b2bScaledDamage).toBe(3);
    expect(result.attackResult?.perfectClearScaledDamage).toBe(5);
  });

  it("applies tetris_focus_tradeoff only to Tetris attacks as positive typeBonus", () => {
    const result = new EffectResolver().applyAttackModifiers(createReferenceAttackResult(), [relicDefinitions.tetris_focus_tradeoff], {
      linesCleared: 4,
      backToBackActive: false,
      isTSpin: false,
    });

    expect(result.typeBonus).toBe(0.3);
    expect(result.baseScaledDamage).toBe(13);
    expect(result.totalDamage).toBe(28);
  });

  it("applies tetris_focus_tradeoff only to T-spin attacks as negative typeBonus", () => {
    const result = new EffectResolver().applyAttackModifiers(createReferenceAttackResult(), [relicDefinitions.tetris_focus_tradeoff], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
    });

    expect(result.typeBonus).toBe(-0.3);
    expect(result.baseScaledDamage).toBe(7);
    expect(result.totalDamage).toBe(22);
  });

  it("does not apply tetris_focus_tradeoff to normal Single or Double attacks", () => {
    const resolver = new EffectResolver();
    const single = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 1, linesCleared: 1 }), [relicDefinitions.tetris_focus_tradeoff], {
      linesCleared: 1,
      backToBackActive: false,
      isTSpin: false,
    });
    const double = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 1, linesCleared: 2 }), [relicDefinitions.tetris_focus_tradeoff], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: false,
    });

    expect(single.totalDamage).toBe(1);
    expect(double.totalDamage).toBe(1);
    expect(single.typeBonus).toBe(0);
    expect(double.typeBonus).toBe(0);
  });

  it("keeps tetris_focus_tradeoff T-spin penalty clamped to non-negative final damage", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 0, linesCleared: 0 }), [relicDefinitions.tetris_focus_tradeoff], {
      linesCleared: 0,
      backToBackActive: false,
      isTSpin: true,
    });

    expect(result.typeBonus).toBe(-0.3);
    expect(result.totalDamage).toBe(0);
  });

  it("applies Perfect Clear flat and multiplier relics only when isPerfectClear is true", () => {
    const inactive = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, perfectClearDamage: 10 }),
      [relicDefinitions.perfect_clear_flat_1],
      { linesCleared: 4, backToBackActive: false, isPerfectClear: false },
    );
    const flat1 = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, perfectClearDamage: 10 }),
      [relicDefinitions.perfect_clear_flat_1],
      { linesCleared: 4, backToBackActive: false, isPerfectClear: true },
    );
    const flat2 = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, perfectClearDamage: 10 }),
      [relicDefinitions.perfect_clear_flat_2],
      { linesCleared: 4, backToBackActive: false, isPerfectClear: true },
    );
    const power1 = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, perfectClearDamage: 10 }),
      [relicDefinitions.perfect_clear_power_1],
      { linesCleared: 4, backToBackActive: false, isPerfectClear: true },
    );
    const power2 = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, perfectClearDamage: 10 }),
      [relicDefinitions.perfect_clear_power_2],
      { linesCleared: 4, backToBackActive: false, isPerfectClear: true },
    );

    expect(inactive.perfectClearDamage).toBe(10);
    expect(inactive.totalDamage).toBe(14);
    expect(flat1.perfectClearDamage).toBe(13);
    expect(flat1.totalDamage).toBe(17);
    expect(flat2.perfectClearDamage).toBe(15);
    expect(flat2.totalDamage).toBe(19);
    expect(power1.perfectClearDamageMultiplier).toBe(1.2);
    expect(power1.perfectClearScaledDamage).toBe(12);
    expect(power1.totalDamage).toBe(16);
    expect(power2.perfectClearDamageMultiplier).toBe(1.3);
    expect(power2.perfectClearScaledDamage).toBe(13);
    expect(power2.totalDamage).toBe(17);
  });

  it("applies B2B multiple relics only for matching multiple contexts", () => {
    const notMultiple3 = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 10, b2bDamage: 2 }),
      [relicDefinitions.b2b_multiple_3_power],
      { linesCleared: 4, backToBackActive: true, isB2BMultipleOf3: false },
    );
    const multiple3 = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 10, b2bDamage: 2 }),
      [relicDefinitions.b2b_multiple_3_power],
      { linesCleared: 4, backToBackActive: true, isB2BMultipleOf3: true },
    );
    const notMultiple10 = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, b2bDamage: 5 }),
      [relicDefinitions.b2b_multiple_10_bonus],
      { linesCleared: 4, backToBackActive: true, isB2BMultipleOf10: false },
    );
    const multiple10 = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, b2bDamage: 5 }),
      [relicDefinitions.b2b_multiple_10_bonus],
      { linesCleared: 4, backToBackActive: true, isB2BMultipleOf10: true },
    );

    expect(notMultiple3.totalDamage).toBe(12);
    expect(multiple3.stateBonus).toBe(0.3);
    expect(multiple3.totalDamage).toBe(15);
    expect(notMultiple10.b2bDamage).toBe(5);
    expect(notMultiple10.totalDamage).toBe(9);
    expect(multiple10.b2bDamage).toBe(15);
    expect(multiple10.totalDamage).toBe(19);
  });

  it("applies boss condition relics only during boss fights", () => {
    const tetrisInactive = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 10, linesCleared: 4 }),
      [relicDefinitions.boss_tetris_power],
      { linesCleared: 4, backToBackActive: false, isBoss: false },
    );
    const tetrisActive = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 10, linesCleared: 4 }),
      [relicDefinitions.boss_tetris_power],
      { linesCleared: 4, backToBackActive: false, isBoss: true },
    );
    const tspinInactive = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 10, linesCleared: 2 }),
      [relicDefinitions.boss_tspin_power],
      { linesCleared: 2, backToBackActive: false, isBoss: true, isTSpin: false },
    );
    const tspinActive = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 10, linesCleared: 2 }),
      [relicDefinitions.boss_tspin_power],
      { linesCleared: 2, backToBackActive: false, isBoss: true, isTSpin: true },
    );
    const b2bInactive = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, b2bDamage: 10 }),
      [relicDefinitions.boss_b2b_power],
      { linesCleared: 4, backToBackActive: true, isBoss: false, b2bCount: 1 },
    );
    const b2bActive = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, b2bDamage: 10 }),
      [relicDefinitions.boss_b2b_power],
      { linesCleared: 4, backToBackActive: true, isBoss: true, b2bCount: 1 },
    );
    const comboInactive = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, comboDamage: 3 }),
      [relicDefinitions.boss_combo_power],
      { linesCleared: 2, backToBackActive: false, isBoss: true, combo: 1 },
    );
    const comboActive = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, comboDamage: 3 }),
      [relicDefinitions.boss_combo_power],
      { linesCleared: 2, backToBackActive: false, isBoss: true, combo: 2 },
    );

    expect(tetrisInactive.totalDamage).toBe(10);
    expect(tetrisActive.typeBonus).toBe(0.25);
    expect(tetrisActive.totalDamage).toBe(13);
    expect(tspinInactive.totalDamage).toBe(10);
    expect(tspinActive.typeBonus).toBe(0.25);
    expect(tspinActive.totalDamage).toBe(13);
    expect(b2bInactive.totalDamage).toBe(14);
    expect(b2bActive.b2bDamageMultiplier).toBe(1.2);
    expect(b2bActive.totalDamage).toBe(16);
    expect(comboInactive.totalDamage).toBe(7);
    expect(comboActive.comboDamage).toBe(4);
    expect(comboActive.totalDamage).toBe(8);
  });

  it("applies small line relics only to normal line clears and not T-spins", () => {
    const resolver = new EffectResolver();
    const single = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 1 }), [relicDefinitions.small_line_bonus], {
      linesCleared: 1,
      backToBackActive: false,
      isTSpin: false,
    });
    const double = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 2 }), [relicDefinitions.double_line_bonus], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: false,
    });
    const tSpinDouble = resolver.applyAttackModifiers(
      createAttackResult({ baseAttack: 4, linesCleared: 2 }),
      [relicDefinitions.small_line_bonus, relicDefinitions.double_line_bonus],
      {
        linesCleared: 2,
        backToBackActive: false,
        isTSpin: true,
      },
    );

    expect(single.flatBonus).toBe(1);
    expect(single.totalDamage).toBe(5);
    expect(double.flatBonus).toBe(1);
    expect(double.totalDamage).toBe(5);
    expect(tSpinDouble.flatBonus).toBe(0);
    expect(tSpinDouble.totalDamage).toBe(4);
  });

  it("applies line clear tradeoff relics to the intended buckets", () => {
    const resolver = new EffectResolver();
    const tetrisPenalty = resolver.applyAttackModifiers(
      createAttackResult({ baseAttack: 10, linesCleared: 4 }),
      [relicDefinitions.small_line_tetris_tradeoff],
      { linesCleared: 4, backToBackActive: false, isTSpin: false },
    );
    const tSpinPenalty = resolver.applyAttackModifiers(
      createAttackResult({ baseAttack: 10, linesCleared: 2 }),
      [relicDefinitions.small_line_tspin_tradeoff],
      { linesCleared: 2, backToBackActive: false, isTSpin: true },
    );
    const basicTriple = resolver.applyAttackModifiers(
      createAttackResult({ baseAttack: 4, linesCleared: 3 }),
      [relicDefinitions.basic_line_clear_focus],
      { linesCleared: 3, backToBackActive: false, isTSpin: false },
    );
    const basicTSpinPenalty = resolver.applyAttackModifiers(
      createAttackResult({ baseAttack: 10, linesCleared: 1 }),
      [relicDefinitions.basic_line_clear_focus],
      { linesCleared: 1, backToBackActive: false, isTSpin: true },
    );

    expect(tetrisPenalty.typeBonus).toBe(-0.2);
    expect(tetrisPenalty.totalDamage).toBe(8);
    expect(tSpinPenalty.typeBonus).toBe(-0.2);
    expect(tSpinPenalty.flatBonus).toBe(0);
    expect(tSpinPenalty.totalDamage).toBe(8);
    expect(basicTriple.flatBonus).toBe(1);
    expect(basicTriple.totalDamage).toBe(5);
    expect(basicTSpinPenalty.typeBonus).toBe(-0.3);
    expect(basicTSpinPenalty.flatBonus).toBe(0);
    expect(basicTSpinPenalty.totalDamage).toBe(7);
  });

  it("applies new T-spin type relics only for their conditions", () => {
    const powerInactive = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 10, linesCleared: 2 }), [relicDefinitions.tspin_power_2], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: false,
    });
    const powerActive = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 10, linesCleared: 2 }), [relicDefinitions.tspin_power_2], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
    });
    const tradeoffTSpin = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 10, linesCleared: 2 }), [relicDefinitions.tspin_focus_tradeoff], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
    });
    const tradeoffTetris = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 10, linesCleared: 4 }), [relicDefinitions.tspin_focus_tradeoff], {
      linesCleared: 4,
      backToBackActive: false,
      isTSpin: false,
    });

    expect(powerInactive.totalDamage).toBe(10);
    expect(powerActive.typeBonus).toBe(0.5);
    expect(powerActive.totalDamage).toBe(15);
    expect(tradeoffTSpin.typeBonus).toBe(0.3);
    expect(tradeoffTSpin.totalDamage).toBe(13);
    expect(tradeoffTetris.typeBonus).toBe(-0.3);
    expect(tradeoffTetris.totalDamage).toBe(7);
  });

  it("applies next-piece and used-piece relics only for matching piece contexts", () => {
    const nextTInactive = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 10, linesCleared: 2 }), [relicDefinitions.next_t_tspin_power], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
      hasNextPieceT: false,
    });
    const nextTActive = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 10, linesCleared: 2 }), [relicDefinitions.next_t_tspin_power], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
      hasNextPieceT: true,
    });
    const nextIInactive = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 10, linesCleared: 4 }), [relicDefinitions.next_i_tetris_power], {
      linesCleared: 4,
      backToBackActive: false,
      hasNextPieceI: false,
    });
    const nextIActive = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 10, linesCleared: 4 }), [relicDefinitions.next_i_tetris_power], {
      linesCleared: 4,
      backToBackActive: false,
      hasNextPieceI: true,
    });
    const iPiece = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 1 }), [relicDefinitions.i_piece_line_bonus], {
      linesCleared: 1,
      backToBackActive: false,
      usedPieceType: "I",
    });
    const tPiece = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 20, linesCleared: 1 }), [relicDefinitions.t_piece_line_power], {
      linesCleared: 1,
      backToBackActive: false,
      usedPieceType: "T",
    });
    const wrongPiece = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 20, linesCleared: 1 }),
      [relicDefinitions.i_piece_line_bonus, relicDefinitions.t_piece_line_power],
      { linesCleared: 1, backToBackActive: false, usedPieceType: "S" },
    );

    expect(nextTInactive.totalDamage).toBe(10);
    expect(nextTActive.typeBonus).toBe(0.25);
    expect(nextTActive.totalDamage).toBe(13);
    expect(nextIInactive.totalDamage).toBe(10);
    expect(nextIActive.typeBonus).toBe(0.25);
    expect(nextIActive.totalDamage).toBe(13);
    expect(iPiece.flatBonus).toBe(1);
    expect(iPiece.totalDamage).toBe(5);
    expect(tPiece.stateBonus).toBe(0.15);
    expect(tPiece.totalDamage).toBe(23);
    expect(wrongPiece.totalDamage).toBe(20);
  });

  it("applies bucket-specific relic modifiers to only their own damage buckets", () => {
    const result = new EffectResolver().applyAttackModifiers(
      createAttackResult({
        baseAttack: 10,
        comboDamage: 3,
        b2bDamage: 2,
        perfectClearDamage: 6,
        flatBonus: 1,
        counterBonus: 2,
      }),
      [bucketRelic],
      {
        linesCleared: 4,
        backToBackActive: true,
        b2bCount: 2,
      },
      { includeDetails: true },
    );

    expect(result.attackResult?.baseScaledDamage).toBe(13);
    expect(result.attackResult?.comboScaledDamage).toBe(6);
    expect(result.attackResult?.b2bScaledDamage).toBe(3);
    expect(result.attackResult?.perfectClearScaledDamage).toBe(9);
    expect(result.attackResult?.finalDamage).toBe(34);
  });

  it.each([
    ["typeBonusAdd", { typeBonusAdd: 0.2 }, { typeBonus: 0.2, baseScaledDamage: 12, finalDamage: 27 }],
    ["stateBonusAdd", { stateBonusAdd: 0.3 }, { stateBonus: 0.3, baseScaledDamage: 13, finalDamage: 28 }],
    ["comboDamageAdd", { comboDamageAdd: 2 }, { comboDamage: 6, comboScaledDamage: 6, finalDamage: 27 }],
    [
      "comboDamageMultiplierAdd",
      { comboDamageMultiplierAdd: 0.5 },
      { comboDamageMultiplier: 1.5, comboScaledDamage: 6, finalDamage: 27 },
    ],
    ["b2bDamageAdd", { b2bDamageAdd: 2 }, { b2bDamage: 5, b2bScaledDamage: 5, finalDamage: 27 }],
    [
      "b2bDamageMultiplierAdd",
      { b2bDamageMultiplierAdd: 1 },
      { b2bDamageMultiplier: 2, b2bScaledDamage: 6, finalDamage: 28 },
    ],
    [
      "perfectClearDamageAdd",
      { perfectClearDamageAdd: 2 },
      { perfectClearDamage: 7, perfectClearScaledDamage: 7, finalDamage: 27 },
    ],
    [
      "perfectClearDamageMultiplierAdd",
      { perfectClearDamageMultiplierAdd: 0.4 },
      { perfectClearDamageMultiplier: 1.4, perfectClearScaledDamage: 7, finalDamage: 27 },
    ],
    ["flatBonusAdd", { flatBonusAdd: 3 }, { flatBonus: 4, finalDamage: 28 }],
    ["counterBonusAdd", { counterBonusAdd: 4 }, { counterBonus: 6, finalDamage: 29 }],
  ] as const)("applies %s only to its own damage bucket", (_fieldName, modifierFields, expected) => {
    const result = applySingleBucketModifier(modifierFields);

    expectBucket(result.attackResult, expected);
  });

  it("keeps legacy attackMultiplier and addAttack compatible with the bucket damage path", () => {
    const result = applySingleBucketModifier({ attackMultiplier: 1.25, addAttack: 2 });

    expectBucket(result.attackResult, {
      typeBonus: 0.25,
      baseScaledDamage: 13,
      flatBonus: 3,
      finalDamage: 30,
    });
  });

  it.each([
    ["danger_power", relicDefinitions.danger_power, { linesCleared: 4, backToBackActive: false, isDanger: true }, 0.5, 15, 30],
    [
      "garbage_surge",
      relicDefinitions.garbage_surge,
      { linesCleared: 4, backToBackActive: false, pendingGarbageLines: 6 },
      0.35,
      14,
      29,
    ],
    ["compressed_preview", relicDefinitions.compressed_preview, { linesCleared: 4, backToBackActive: false }, 0.1, 11, 26],
  ] as const)("applies %s as stateBonusAdd only to baseAttack", (_id, relic, context, expectedStateBonus, expectedBase, expectedFinal) => {
    const result = new EffectResolver().applyAttackModifiers(createReferenceAttackResult(), [relic], context, {
      includeDetails: true,
    });

    expectBucket(result.attackResult, {
      stateBonus: expectedStateBonus,
      baseScaledDamage: expectedBase,
      finalDamage: expectedFinal,
    });
    expect(result.attackResult?.comboScaledDamage).toBe(4);
    expect(result.attackResult?.b2bScaledDamage).toBe(3);
    expect(result.attackResult?.perfectClearScaledDamage).toBe(5);
  });

  it("clamps final bucket damage to zero", () => {
    const result = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 1 }),
      [negativeFlatRelic],
      {
        linesCleared: 1,
        backToBackActive: false,
      },
      { includeDetails: true },
    );

    expect(result.attackResult?.finalDamage).toBe(0);
  });

  it("applies the representative Tetris condition relic", () => {
    const result = new EffectResolver().applyAttackModifiers(
      createAttackResult({ baseAttack: 4, linesCleared: 4 }),
      [relicDefinitions.tetris_overwhelm],
      {
        linesCleared: 4,
        backToBackActive: false,
      },
    );

    expect(result.totalDamage).toBe(6);
  });

  it("applies danger_power only when danger context is true", () => {
    const resolver = new EffectResolver();
    const safe = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.danger_power], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: false,
    });
    const danger = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.danger_power], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: true,
    });

    expect(safe.totalDamage).toBe(4);
    expect(danger.totalDamage).toBe(6);
  });

  it("does not apply fast_power as a direct attack modifier", () => {
    const resolver = new EffectResolver();
    const fast = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.fast_power], {
      linesCleared: 4,
      backToBackActive: false,
      fastChain: 20,
    });

    expect(fast.totalDamage).toBe(4);
  });

  it("applies compressed_preview as a +10% unconditional attack multiplier", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 10 }), [relicDefinitions.compressed_preview], {
      linesCleared: 1,
      backToBackActive: false,
    });

    expect(result.totalDamage).toBe(11);
  });

  it("applies next_down_flat_bonus as a final flat bonus for every attack", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, comboDamage: 2 }), [relicDefinitions.next_down_flat_bonus], {
      linesCleared: 4,
      backToBackActive: false,
    });

    expect(result.baseScaledDamage).toBe(4);
    expect(result.comboScaledDamage).toBe(2);
    expect(result.flatBonus).toBe(1);
    expect(result.totalDamage).toBe(7);
  });

  it("applies next_down_small_line_bonus only to normal Single and Double attacks", () => {
    const resolver = new EffectResolver();
    const single = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 1, linesCleared: 1 }), [relicDefinitions.next_down_small_line_bonus], {
      attackKind: "LineClear",
      linesCleared: 1,
      backToBackActive: false,
      isTSpin: false,
    });
    const double = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 2, linesCleared: 2 }), [relicDefinitions.next_down_small_line_bonus], {
      attackKind: "LineClear",
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: false,
    });
    const tetris = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 4 }), [relicDefinitions.next_down_small_line_bonus], {
      attackKind: "LineClear",
      linesCleared: 4,
      backToBackActive: false,
      isTSpin: false,
    });
    const tSpinDouble = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 2 }), [relicDefinitions.next_down_small_line_bonus], {
      attackKind: "TSpin",
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
    });

    expect(single.flatBonus).toBe(1);
    expect(single.totalDamage).toBe(2);
    expect(double.flatBonus).toBe(1);
    expect(double.totalDamage).toBe(3);
    expect(tetris.flatBonus).toBe(0);
    expect(tetris.totalDamage).toBe(4);
    expect(tSpinDouble.flatBonus).toBe(0);
    expect(tSpinDouble.totalDamage).toBe(4);
  });

  it("applies no_hold_focus as Hold abandon flat damage", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.no_hold_focus], {
      linesCleared: 1,
      backToBackActive: false,
    });

    expect(result.totalDamage).toBe(6);
    expect(result.flatBonus).toBe(2);
  });

  it("applies forced_speed as a +10% unconditional attack multiplier", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 10 }), [relicDefinitions.forced_speed], {
      linesCleared: 1,
      backToBackActive: false,
    });

    expect(result.totalDamage).toBe(11);
  });

  it("applies overheated_drop as a +20% unconditional attack multiplier", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 20 }), [relicDefinitions.overheated_drop], {
      linesCleared: 1,
      backToBackActive: false,
    });

    expect(result.totalDamage).toBe(24);
  });

  it("applies quick_judgement b2b multiplier only for B2B count", () => {
    const inactive = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, b2bDamage: 1 }), [relicDefinitions.quick_judgement], {
      linesCleared: 4,
      backToBackActive: false,
      b2bCount: 0,
    });
    const active = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, b2bDamage: 4 }), [relicDefinitions.quick_judgement], {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 4,
    });

    expect(inactive.totalDamage).toBe(5);
    expect(active.totalDamage).toBe(9);
  });

  it("applies B2B flat and pressure relics only to B2B damage", () => {
    const flat = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, b2bDamage: 2 }), [relicDefinitions.b2b_flat_bonus], {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 2,
    });
    const pressure = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, b2bDamage: 10 }), [relicDefinitions.b2b_pressure], {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 10,
    });

    expect(flat.b2bDamage).toBe(3);
    expect(flat.b2bScaledDamage).toBe(3);
    expect(flat.totalDamage).toBe(7);
    expect(pressure.b2bDamage).toBe(10);
    expect(pressure.b2bDamageMultiplier).toBe(1.1);
    expect(pressure.b2bScaledDamage).toBe(11);
    expect(pressure.totalDamage).toBe(15);
  });

  it("applies b2b_power_2 only to the B2B bucket", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, b2bDamage: 10 }), [relicDefinitions.b2b_power_2], {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 1,
    });

    expect(result.baseScaledDamage).toBe(4);
    expect(result.b2bDamage).toBe(10);
    expect(result.b2bDamageMultiplier).toBe(1.2);
    expect(result.b2bScaledDamage).toBe(12);
    expect(result.comboScaledDamage).toBe(0);
    expect(result.perfectClearScaledDamage).toBe(0);
    expect(result.totalDamage).toBe(16);
  });

  it("applies holdless_focus only before hold is used this battle", () => {
    const resolver = new EffectResolver();
    const beforeHold = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.holdless_focus], {
      linesCleared: 4,
      backToBackActive: false,
      holdUsedThisBattle: false,
    });
    const afterHold = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.holdless_focus], {
      linesCleared: 4,
      backToBackActive: false,
      holdUsedThisBattle: true,
    });

    expect(beforeHold.totalDamage).toBe(5);
    expect(afterHold.totalDamage).toBe(4);
  });

  it("applies hole_power to normal Single and Double attacks when holeCount is at least 3", () => {
    const resolver = new EffectResolver();
    const single = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 1, linesCleared: 1 }), [relicDefinitions.hole_power], {
      attackKind: "LineClear",
      linesCleared: 1,
      backToBackActive: false,
      holeCount: 3,
      isTSpin: false,
    });
    const double = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 2, linesCleared: 2 }), [relicDefinitions.hole_power], {
      attackKind: "LineClear",
      linesCleared: 2,
      backToBackActive: false,
      holeCount: 3,
      isTSpin: false,
    });

    expect(single.flatBonus).toBe(1);
    expect(single.totalDamage).toBe(2);
    expect(double.flatBonus).toBe(1);
    expect(double.totalDamage).toBe(3);
  });

  it("does not apply hole_power below threshold or to Tetris, T-spin, and Triple attacks", () => {
    const resolver = new EffectResolver();
    const lowHole = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 1, linesCleared: 1 }), [relicDefinitions.hole_power], {
      attackKind: "LineClear",
      linesCleared: 1,
      backToBackActive: false,
      holeCount: 2,
      isTSpin: false,
    });
    const tetris = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 4 }), [relicDefinitions.hole_power], {
      attackKind: "LineClear",
      linesCleared: 4,
      backToBackActive: false,
      holeCount: 3,
      isTSpin: false,
    });
    const tSpin = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 2, linesCleared: 2 }), [relicDefinitions.hole_power], {
      attackKind: "TSpin",
      linesCleared: 2,
      backToBackActive: false,
      holeCount: 3,
      isTSpin: true,
    });
    const triple = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 3, linesCleared: 3 }), [relicDefinitions.hole_power], {
      attackKind: "LineClear",
      linesCleared: 3,
      backToBackActive: false,
      holeCount: 3,
      isTSpin: false,
    });

    expect(lowHole.flatBonus).toBe(0);
    expect(tetris.flatBonus).toBe(0);
    expect(tSpin.flatBonus).toBe(0);
    expect(triple.flatBonus).toBe(0);
  });

  it("applies broken_field_power to normal Single and Double attacks when holeCount is at least 5", () => {
    const resolver = new EffectResolver();
    const single = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 1, linesCleared: 1 }), [relicDefinitions.broken_field_power], {
      attackKind: "LineClear",
      linesCleared: 1,
      backToBackActive: false,
      holeCount: 5,
      isTSpin: false,
    });
    const double = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 2, linesCleared: 2 }), [relicDefinitions.broken_field_power], {
      attackKind: "LineClear",
      linesCleared: 2,
      backToBackActive: false,
      holeCount: 5,
      isTSpin: false,
    });
    const triple = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 3, linesCleared: 3 }), [relicDefinitions.broken_field_power], {
      attackKind: "LineClear",
      linesCleared: 3,
      backToBackActive: false,
      holeCount: 5,
      isTSpin: false,
    });

    expect(single.flatBonus).toBe(2);
    expect(single.totalDamage).toBe(3);
    expect(double.flatBonus).toBe(2);
    expect(double.totalDamage).toBe(4);
    expect(triple.flatBonus).toBe(0);
  });

  it("does not apply fast_chain_power as a direct attack modifier", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.fast_chain_power], {
      linesCleared: 4,
      backToBackActive: false,
      fastChain: 30,
    });

    expect(result.totalDamage).toBe(4);
  });

  it("applies garbage_absorb when pendingGarbageLines is at least 3", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.garbage_absorb], {
      linesCleared: 4,
      backToBackActive: false,
      pendingGarbageLines: 3,
    });

    expect(result.totalDamage).toBe(5);
  });

  it("does not apply representative conditional relics when their conditions are not met", () => {
    const result = new EffectResolver().applyAttackModifiers(
      4,
      [
        relicDefinitions.hole_power,
        relicDefinitions.garbage_absorb,
        relicDefinitions.holdless_focus,
      ],
      {
        linesCleared: 4,
        backToBackActive: false,
        holeCount: 2,
        fastChain: 2,
        pendingGarbageLines: 2,
        holdUsedThisBattle: true,
      },
    );

    expect(result).toBe(4);
  });

  it("applies spin_pierce only for T-spin context", () => {
    const normal = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 4 }), [relicDefinitions.spin_pierce], {
      linesCleared: 4,
      backToBackActive: false,
      isTSpin: false,
    });
    const tSpin = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 2 }), [relicDefinitions.spin_pierce], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
    });

    expect(normal.totalDamage).toBe(4);
    expect(tSpin.totalDamage).toBe(5);
  });

  it("applies mini_spin_bonus for T-spin Mini context", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 1 }), [relicDefinitions.mini_spin_bonus], {
      linesCleared: 1,
      backToBackActive: false,
      isTSpin: true,
      isTSpinMini: true,
      isTSpinFull: false,
    });

    expect(result.totalDamage).toBe(5);
    expect(result.flatBonus).toBe(1);
  });

  it("applies tsd_tst_power for T-spin Double or Triple", () => {
    const single = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 1 }), [relicDefinitions.tsd_tst_power], {
      linesCleared: 1,
      backToBackActive: false,
      isTSpin: true,
    });
    const double = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 2 }), [relicDefinitions.tsd_tst_power], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
    });

    expect(single.totalDamage).toBe(4);
    expect(double.totalDamage).toBe(5);
  });

  it("applies b2b_maintain_power only when B2B count is at least 10", () => {
    const inactive = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 20, b2bDamage: 4 }), [relicDefinitions.b2b_maintain_power], {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 9,
    });
    const active = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 20, b2bDamage: 20 }), [relicDefinitions.b2b_maintain_power], {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 10,
    });

    expect(inactive.totalDamage).toBe(24);
    expect(active.totalDamage).toBe(43);
  });

  it("applies b2b_under_10_power only when B2B count is 1 through 10", () => {
    const resolver = new EffectResolver();
    const inactiveZero = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, b2bDamage: 10 }), [relicDefinitions.b2b_under_10_power], {
      linesCleared: 4,
      backToBackActive: false,
      b2bCount: 0,
    });
    const activeOne = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, b2bDamage: 10 }), [relicDefinitions.b2b_under_10_power], {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 1,
    });
    const activeTen = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, b2bDamage: 10 }), [relicDefinitions.b2b_under_10_power], {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 10,
    });
    const inactiveEleven = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, b2bDamage: 10 }), [relicDefinitions.b2b_under_10_power], {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 11,
    });

    expect(inactiveZero.b2bDamageMultiplier).toBe(1);
    expect(inactiveZero.totalDamage).toBe(14);
    expect(activeOne.b2bDamageMultiplier).toBe(1.2);
    expect(activeOne.totalDamage).toBe(16);
    expect(activeTen.b2bDamageMultiplier).toBe(1.2);
    expect(activeTen.totalDamage).toBe(16);
    expect(inactiveEleven.b2bDamageMultiplier).toBe(1);
    expect(inactiveEleven.totalDamage).toBe(14);
  });

  it("applies combo_attack when combo is at least 2", () => {
    const inactive = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.combo_attack], {
      linesCleared: 4,
      backToBackActive: false,
      combo: 1,
    });
    const active = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.combo_attack], {
      linesCleared: 4,
      backToBackActive: false,
      combo: 2,
    });

    expect(inactive.totalDamage).toBe(4);
    expect(active.totalDamage).toBe(5);
    expect(active.comboDamage).toBe(1);
  });

  it("applies long_combo_flow when combo is at least 9", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.long_combo_flow], {
      linesCleared: 4,
      backToBackActive: false,
      combo: 9,
    });

    expect(result.totalDamage).toBe(6);
    expect(result.comboDamage).toBe(2);
  });

  it("applies new combo relics for threshold, small attack, and low field conditions", () => {
    const combo4 = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.combo_4_bonus], {
      linesCleared: 2,
      backToBackActive: false,
      combo: 4,
    });
    const smallCombo = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 2 }), [relicDefinitions.combo_small_attack_bonus], {
      linesCleared: 2,
      backToBackActive: false,
      combo: 2,
    });
    const largeCombo = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 4 }), [relicDefinitions.combo_small_attack_bonus], {
      linesCleared: 4,
      backToBackActive: false,
      combo: 2,
    });
    const lowFieldCombo = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.low_field_combo_bonus], {
      linesCleared: 2,
      backToBackActive: false,
      combo: 2,
      fieldHeight: 4,
    });
    const lowCombo = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.low_combo_bonus], {
      linesCleared: 2,
      backToBackActive: false,
      combo: 5,
    });
    const highCombo = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.low_combo_bonus], {
      linesCleared: 2,
      backToBackActive: false,
      combo: 6,
    });

    expect(combo4.totalDamage).toBe(5);
    expect(combo4.comboDamage).toBe(1);
    expect(smallCombo.totalDamage).toBe(5);
    expect(smallCombo.flatBonus).toBe(1);
    expect(largeCombo.totalDamage).toBe(4);
    expect(lowFieldCombo.totalDamage).toBe(5);
    expect(lowFieldCombo.comboDamage).toBe(1);
    expect(lowCombo.totalDamage).toBe(5);
    expect(lowCombo.comboDamage).toBe(1);
    expect(highCombo.totalDamage).toBe(4);
  });

  it("applies new danger relics for line clear and combo attacks", () => {
    const dangerLine = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.danger_line_bonus], {
      linesCleared: 1,
      backToBackActive: false,
      isDanger: true,
    });
    const dangerCombo = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.danger_combo_power], {
      linesCleared: 1,
      backToBackActive: false,
      isDanger: true,
      combo: 2,
    });
    const safeCombo = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.danger_combo_power], {
      linesCleared: 1,
      backToBackActive: false,
      isDanger: false,
      combo: 2,
    });

    expect(dangerLine.totalDamage).toBe(5);
    expect(dangerLine.flatBonus).toBe(1);
    expect(dangerCombo.totalDamage).toBe(5);
    expect(dangerCombo.comboDamage).toBe(1);
    expect(safeCombo.totalDamage).toBe(4);
  });

  it("applies hole_tspin_power when holes and T-spin are both present", () => {
    const noHole = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 2 }), [relicDefinitions.hole_tspin_power], {
      linesCleared: 2,
      backToBackActive: false,
      holeCount: 0,
      isTSpin: true,
    });
    const active = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 2 }), [relicDefinitions.hole_tspin_power], {
      linesCleared: 2,
      backToBackActive: false,
      holeCount: 1,
      isTSpin: true,
    });

    expect(noHole.totalDamage).toBe(4);
    expect(active.totalDamage).toBe(5);
  });

  it("applies low and clean field attack relics", () => {
    const lowField = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 10 }), [relicDefinitions.low_field_power], {
      linesCleared: 1,
      backToBackActive: false,
      fieldHeight: 4,
    });
    const cleanField = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 8 }), [relicDefinitions.clean_field_power], {
      linesCleared: 1,
      backToBackActive: false,
      fieldHeight: 4,
      holeCount: 0,
    });
    const dirtyField = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 8 }), [relicDefinitions.clean_field_power], {
      linesCleared: 1,
      backToBackActive: false,
      fieldHeight: 4,
      holeCount: 1,
    });

    expect(lowField.totalDamage).toBe(12);
    expect(cleanField.totalDamage).toBe(10);
    expect(dirtyField.totalDamage).toBe(8);
  });

  it("applies Fast high-speed flat attack only at fastChain 20", () => {
    const notStrong = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 20 }), [relicDefinitions.fast_strong_attack], {
      linesCleared: 1,
      backToBackActive: false,
      fastChain: 19,
    });
    const strong = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 20 }), [relicDefinitions.fast_strong_attack], {
      linesCleared: 1,
      backToBackActive: false,
      fastChain: 20,
    });
    expect(notStrong.totalDamage).toBe(20);
    expect(strong.totalDamage).toBe(21);
    expect(strong.flatBonus).toBe(1);
  });

  it("can use GarbageQueue total amount as pending garbage context", () => {
    const queue = new GarbageQueue({}, [
      { id: "garbage_1", amount: 2, source: "test", remainingDelay: 1 },
      { id: "garbage_2", amount: 3, source: "test", remainingDelay: 2 },
    ]);

    expect(queue.getTotalAmount()).toBe(5);
  });

  it("keeps equals boolean conditions compatible with existing relic definitions", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.danger_power], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: true,
    });

    expect(result.totalDamage).toBe(6);
  });

  it("applies gte number conditions when the context reaches the threshold", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [garbagePressureRelic], {
      linesCleared: 4,
      backToBackActive: false,
      pendingGarbageLines: 3,
    });

    expect(result).toBe(5);
  });

  it("does not apply gte number conditions below the threshold", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [garbagePressureRelic], {
      linesCleared: 4,
      backToBackActive: false,
      pendingGarbageLines: 2,
    });

    expect(result).toBe(4);
  });

  it("supports lte number conditions", () => {
    const lowFieldRelic: RelicDefinition = {
      id: "low_field",
      name: "Low Field",
      description: "Test fixture.",
      ...testRelicMeta,
      modifiers: [{ trigger: "onAttackCalculated", attackMultiplier: 1.25, when: { fieldHeight: { lte: 4 } } }],
    };

    const active = new EffectResolver().applyAttackModifiers(4, [lowFieldRelic], {
      linesCleared: 4,
      backToBackActive: false,
      fieldHeight: 4,
    });
    const inactive = new EffectResolver().applyAttackModifiers(4, [lowFieldRelic], {
      linesCleared: 4,
      backToBackActive: false,
      fieldHeight: 5,
    });

    expect(active).toBe(5);
    expect(inactive).toBe(4);
  });

  it("requires every condition in a modifier to match", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [holePressureRelic], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: true,
      holeCount: 3,
    });
    const missingDanger = new EffectResolver().applyAttackModifiers(4, [holePressureRelic], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: false,
      holeCount: 3,
    });

    expect(result).toBe(5);
    expect(missingDanger).toBe(4);
  });

  it("applies whenAny when one condition set matches", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [eitherTetrisOrSpinRelic], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
    });

    expect(result).toBe(5);
  });

  it("does not apply whenAny when no condition set matches", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [eitherTetrisOrSpinRelic], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: false,
    });

    expect(result).toBe(4);
  });

  it("requires when and at least one whenAny condition set when both are present", () => {
    const active = new EffectResolver().applyAttackModifiers(4, [dangerTetrisOrSpinRelic], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: true,
      isTSpin: false,
    });
    const missingAny = new EffectResolver().applyAttackModifiers(4, [dangerTetrisOrSpinRelic], {
      linesCleared: 2,
      backToBackActive: false,
      isDanger: true,
      isTSpin: false,
    });
    const missingWhen = new EffectResolver().applyAttackModifiers(4, [dangerTetrisOrSpinRelic], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: false,
      isTSpin: false,
    });

    expect(active).toBe(5);
    expect(missingAny).toBe(4);
    expect(missingWhen).toBe(4);
  });

  it("applies high_stack_counter for Danger Tetris", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 4 }), [relicDefinitions.high_stack_counter], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: true,
      isTSpin: false,
    });

    expect(result.totalDamage).toBe(5);
  });

  it("applies high_stack_counter for Danger T-spin", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 2 }), [relicDefinitions.high_stack_counter], {
      linesCleared: 2,
      backToBackActive: false,
      isDanger: true,
      isTSpin: true,
    });

    expect(result.totalDamage).toBe(5);
  });

  it("does not apply high_stack_counter outside Danger", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 4 }), [relicDefinitions.high_stack_counter], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: false,
      isTSpin: true,
    });

    expect(result.totalDamage).toBe(4);
  });

  it("does not apply combo_attack from comboBonus alone", () => {
    const result = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 4 }), [relicDefinitions.combo_attack], {
      linesCleared: 4,
      backToBackActive: false,
      combo: 0,
      comboBonus: 1,
    });

    expect(result.totalDamage).toBe(4);
    expect(result.comboDamage).toBe(0);
  });

  it("applies cancel bonus relics only when canceledGarbageLines is positive and their own condition matches", () => {
    const resolver = new EffectResolver();
    const tetris = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 4 }), [relicDefinitions.tetris_cancel_bonus], {
      linesCleared: 4,
      backToBackActive: false,
      canceledGarbageLines: 1,
    });
    const notTetris = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 2, linesCleared: 3 }), [relicDefinitions.tetris_cancel_bonus], {
      linesCleared: 3,
      backToBackActive: false,
      canceledGarbageLines: 1,
    });
    const tSpin = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 2 }), [relicDefinitions.tspin_cancel_bonus], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
      canceledGarbageLines: 1,
    });
    const notCanceled = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 2 }), [relicDefinitions.tspin_cancel_bonus], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
      canceledGarbageLines: 0,
    });

    expect(tetris.counterBonus).toBe(1);
    expect(notTetris.counterBonus).toBe(0);
    expect(tSpin.counterBonus).toBe(1);
    expect(notCanceled.counterBonus).toBe(0);
  });

  it("applies B2B and stable field cancel bonuses only when their full conditions match", () => {
    const resolver = new EffectResolver();
    const b2b = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 4, b2bDamage: 1 }), [relicDefinitions.b2b_cancel_bonus], {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 1,
      canceledGarbageLines: 1,
    });
    const noB2B = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 4 }), [relicDefinitions.b2b_cancel_bonus], {
      linesCleared: 4,
      backToBackActive: false,
      b2bCount: 0,
      canceledGarbageLines: 1,
    });
    const stable = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 4 }), [relicDefinitions.stable_field_cancel_bonus_2], {
      linesCleared: 4,
      backToBackActive: false,
      holeCount: 0,
      fieldHeight: 4,
      canceledGarbageLines: 1,
    });
    const highField = resolver.applyAttackModifiers(createAttackResult({ baseAttack: 4, linesCleared: 4 }), [relicDefinitions.stable_field_cancel_bonus_2], {
      linesCleared: 4,
      backToBackActive: false,
      holeCount: 0,
      fieldHeight: 5,
      canceledGarbageLines: 1,
    });

    expect(b2b.b2bDamage).toBe(2);
    expect(noB2B.b2bDamage).toBe(0);
    expect(stable.counterBonus).toBe(2);
    expect(highField.counterBonus).toBe(0);
  });

  it.each([
    ["isPerfectClear", { isPerfectClear: true }],
    ["isB2BMultipleOf3", { isB2BMultipleOf3: true }],
    ["isB2BMultipleOf10", { isB2BMultipleOf10: true }],
    ["consecutiveTetrisCount", { consecutiveTetrisCount: { gte: 2 } }],
    ["consecutiveTSpinCount", { consecutiveTSpinCount: { gte: 2 } }],
    ["canceledGarbageLines", { canceledGarbageLines: { gte: 1 } }],
    ["hasNextPieceT", { hasNextPieceT: true }],
    ["hasNextPieceI", { hasNextPieceI: true }],
    ["usedPieceType", { usedPieceType: "T" }],
    ["isBoss", { isBoss: true }],
    ["clearedHoleCount", { clearedHoleCount: { gte: 1 } }],
  ] as const)("can use %s in modifier conditions", (_name, when) => {
    const relic: RelicDefinition = {
      id: `context_${_name}`,
      name: `Context ${_name}`,
      description: "Test fixture.",
      ...testRelicMeta,
      modifiers: [{ trigger: "onAttackCalculated", addAttack: 1, when }],
    };

    const active = new EffectResolver().applyAttackModifiers(4, [relic], {
      linesCleared: 4,
      backToBackActive: true,
      isPerfectClear: true,
      isB2BMultipleOf3: true,
      isB2BMultipleOf10: true,
      consecutiveTetrisCount: 2,
      consecutiveTSpinCount: 2,
      canceledGarbageLines: 1,
      hasNextPieceT: true,
      hasNextPieceI: true,
      usedPieceType: "T",
      isBoss: true,
      clearedHoleCount: 1,
    });
    const inactive = new EffectResolver().applyAttackModifiers(4, [relic], {
      linesCleared: 4,
      backToBackActive: true,
      isPerfectClear: false,
      isB2BMultipleOf3: false,
      isB2BMultipleOf10: false,
      consecutiveTetrisCount: 1,
      consecutiveTSpinCount: 1,
      canceledGarbageLines: 0,
      hasNextPieceT: false,
      hasNextPieceI: false,
      usedPieceType: "I",
      isBoss: false,
      clearedHoleCount: 0,
    });

    expect(active).toBe(5);
    expect(inactive).toBe(4);
  });

  it("fails safely for unknown context keys and invalid numeric comparisons", () => {
    const unknownContextRelic = {
      id: "unknown_context",
      name: "Unknown Context",
      description: "Test fixture.",
      ...testRelicMeta,
      modifiers: [{ trigger: "onAttackCalculated", attackMultiplier: 1.25, when: { missingContext: { gte: 1 } } }],
    } as unknown as RelicDefinition;
    const invalidBooleanComparison: RelicDefinition = {
      id: "invalid_boolean",
      name: "Invalid Boolean",
      description: "Test fixture.",
      ...testRelicMeta,
      modifiers: [{ trigger: "onAttackCalculated", attackMultiplier: 1.25, when: { isDanger: { gte: 1 } } }],
    };

    const unknown = new EffectResolver().applyAttackModifiers(4, [unknownContextRelic], {
      linesCleared: 4,
      backToBackActive: false,
    });
    const invalid = new EffectResolver().applyAttackModifiers(4, [invalidBooleanComparison], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: true,
    });

    expect(unknown).toBe(4);
    expect(invalid).toBe(4);
  });
});

const testRelicMeta = {
  category: "legacy",
  rarity: "common",
  maxStacks: 1,
  obtainSource: "disabled",
} as const;

const garbagePressureRelic: RelicDefinition = {
  id: "garbage_pressure",
  name: "Garbage Pressure",
  description: "Test fixture.",
  ...testRelicMeta,
  modifiers: [{ trigger: "onAttackCalculated", attackMultiplier: 1.25, when: { pendingGarbageLines: { gte: 3 } } }],
};

const holePressureRelic: RelicDefinition = {
  id: "hole_pressure",
  name: "Hole Pressure",
  description: "Test fixture.",
  ...testRelicMeta,
  modifiers: [{ trigger: "onAttackCalculated", attackMultiplier: 1.25, when: { isDanger: true, holeCount: { gte: 3 } } }],
};

const eitherTetrisOrSpinRelic: RelicDefinition = {
  id: "either_tetris_or_spin",
  name: "Either Tetris Or Spin",
  description: "Test fixture.",
  ...testRelicMeta,
  modifiers: [{ trigger: "onAttackCalculated", attackMultiplier: 1.25, whenAny: [{ linesCleared: 4 }, { isTSpin: true }] }],
};

const dangerTetrisOrSpinRelic: RelicDefinition = {
  id: "danger_tetris_or_spin",
  name: "Danger Tetris Or Spin",
  description: "Test fixture.",
  ...testRelicMeta,
  modifiers: [
    {
      trigger: "onAttackCalculated",
      attackMultiplier: 1.25,
      when: { isDanger: true },
      whenAny: [{ linesCleared: 4 }, { isTSpin: true }],
    },
  ],
};

function createAttackResult(input: {
  baseAttack: number;
  linesCleared?: number;
  comboDamage?: number;
  b2bDamage?: number;
  perfectClearDamage?: number;
  flatBonus?: number;
  counterBonus?: number;
}) {
  return createBaseAttackResult({
    lineClearCount: input.linesCleared ?? 4,
    spinResult: noSpinResult(),
    baseAttack: input.baseAttack,
    comboDamage: input.comboDamage,
    b2bDamage: input.b2bDamage,
    perfectClearDamage: input.perfectClearDamage,
    flatBonus: input.flatBonus,
    counterBonus: input.counterBonus,
  });
}

function createReferenceAttackResult() {
  return createAttackResult({
    baseAttack: 10,
    comboDamage: 4,
    b2bDamage: 3,
    perfectClearDamage: 5,
    flatBonus: 1,
    counterBonus: 2,
  });
}

function applySingleBucketModifier(modifierFields: TestAttackModifierFields) {
  return new EffectResolver().applyAttackModifiers(
    createReferenceAttackResult(),
    [testRelic("single_bucket", modifierFields)],
    {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 3,
    },
    { includeDetails: true },
  );
}

function expectBucket(
  attackResult: ReturnType<typeof createBaseAttackResult> | undefined,
  expected: Partial<ReturnType<typeof createBaseAttackResult>>,
) {
  expect(attackResult).toMatchObject({
    baseAttack: expected.baseAttack ?? 10,
    typeBonus: expected.typeBonus ?? 0,
    stateBonus: expected.stateBonus ?? 0,
    speedBonus: expected.speedBonus ?? 0,
    baseScaledDamage: expected.baseScaledDamage ?? 10,
    comboDamage: expected.comboDamage ?? 4,
    comboDamageMultiplier: expected.comboDamageMultiplier ?? 1,
    comboScaledDamage: expected.comboScaledDamage ?? 4,
    b2bDamage: expected.b2bDamage ?? 3,
    b2bDamageMultiplier: expected.b2bDamageMultiplier ?? 1,
    b2bScaledDamage: expected.b2bScaledDamage ?? 3,
    perfectClearDamage: expected.perfectClearDamage ?? 5,
    perfectClearDamageMultiplier: expected.perfectClearDamageMultiplier ?? 1,
    perfectClearScaledDamage: expected.perfectClearScaledDamage ?? 5,
    flatBonus: expected.flatBonus ?? 1,
    counterBonus: expected.counterBonus ?? 2,
    finalDamage: expected.finalDamage,
    totalDamage: expected.finalDamage,
  });
}

function testRelic(id: string, modifierFields: TestAttackModifierFields): RelicDefinition {
  return {
    id,
    name: id,
    description: "Test fixture.",
    ...testRelicMeta,
    modifiers: [{ trigger: "onAttackCalculated", ...modifierFields }],
  };
}

const bucketRelic: RelicDefinition = {
  id: "bucket_relic",
  name: "Bucket Relic",
  description: "Test fixture.",
  ...testRelicMeta,
  modifiers: [
    {
      trigger: "onAttackCalculated",
      attackMultiplier: 1.25,
      comboDamageMultiplierAdd: 1,
      b2bDamageMultiplierAdd: 0.5,
      perfectClearDamageMultiplierAdd: 0.5,
    },
  ],
};

const negativeFlatRelic: RelicDefinition = {
  id: "negative_flat",
  name: "Negative Flat",
  description: "Test fixture.",
  ...testRelicMeta,
  modifiers: [{ trigger: "onAttackCalculated", flatBonusAdd: -10 }],
};
