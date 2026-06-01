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
    const safe = resolver.applyAttackModifiers(4, [relicDefinitions.danger_power], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: false,
    });
    const danger = resolver.applyAttackModifiers(4, [relicDefinitions.danger_power], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: true,
    });

    expect(safe).toBe(4);
    expect(danger).toBe(6);
  });

  it("applies fast_power only when fastChain context reaches 1", () => {
    const resolver = new EffectResolver();
    const normal = resolver.applyAttackModifiers(4, [relicDefinitions.fast_power], {
      linesCleared: 4,
      backToBackActive: false,
      fastChain: 0,
    });
    const fast = resolver.applyAttackModifiers(4, [relicDefinitions.fast_power], {
      linesCleared: 4,
      backToBackActive: false,
      fastChain: 1,
    });

    expect(normal).toBe(4);
    expect(fast).toBe(5);
  });

  it("applies compressed_preview as an unconditional attack multiplier", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.compressed_preview], {
      linesCleared: 1,
      backToBackActive: false,
    });

    expect(result).toBe(5);
  });

  it("applies no_hold_focus as an unconditional attack multiplier", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.no_hold_focus], {
      linesCleared: 1,
      backToBackActive: false,
    });

    expect(result).toBe(6);
  });

  it("applies forced_speed as an unconditional attack multiplier", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.forced_speed], {
      linesCleared: 1,
      backToBackActive: false,
    });

    expect(result).toBe(5);
  });

  it("applies overheated_drop as an unconditional attack multiplier", () => {
    const result = new EffectResolver().applyAttackModifiers(20, [relicDefinitions.overheated_drop], {
      linesCleared: 1,
      backToBackActive: false,
    });

    expect(result).toBe(27);
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

  it("applies holdless_focus only before hold is used this battle", () => {
    const resolver = new EffectResolver();
    const beforeHold = resolver.applyAttackModifiers(4, [relicDefinitions.holdless_focus], {
      linesCleared: 4,
      backToBackActive: false,
      holdUsedThisBattle: false,
    });
    const afterHold = resolver.applyAttackModifiers(4, [relicDefinitions.holdless_focus], {
      linesCleared: 4,
      backToBackActive: false,
      holdUsedThisBattle: true,
    });

    expect(beforeHold).toBe(5);
    expect(afterHold).toBe(4);
  });

  it("applies hole_power when holeCount is at least 3", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.hole_power], {
      linesCleared: 4,
      backToBackActive: false,
      holeCount: 3,
    });

    expect(result).toBe(5);
  });

  it("applies fast_chain_power when fastChain is at least 3", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.fast_chain_power], {
      linesCleared: 4,
      backToBackActive: false,
      fastChain: 3,
    });

    expect(result).toBe(5);
  });

  it("applies garbage_absorb when pendingGarbageLines is at least 3", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.garbage_absorb], {
      linesCleared: 4,
      backToBackActive: false,
      pendingGarbageLines: 3,
    });

    expect(result).toBe(5);
  });

  it("does not apply representative conditional relics when their conditions are not met", () => {
    const result = new EffectResolver().applyAttackModifiers(
      4,
      [
        relicDefinitions.hole_power,
        relicDefinitions.fast_chain_power,
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
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.mini_spin_bonus], {
      linesCleared: 1,
      backToBackActive: false,
      isTSpin: true,
      isTSpinMini: true,
      isTSpinFull: false,
    });

    expect(result).toBe(5);
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

  it("applies b2b_maintain_power while B2B is active", () => {
    const inactive = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 20, b2bDamage: 4 }), [relicDefinitions.b2b_maintain_power], {
      linesCleared: 4,
      backToBackActive: false,
      b2bCount: 0,
    });
    const active = new EffectResolver().applyAttackModifiers(createAttackResult({ baseAttack: 20, b2bDamage: 20 }), [relicDefinitions.b2b_maintain_power], {
      linesCleared: 4,
      backToBackActive: true,
      b2bCount: 1,
    });

    expect(inactive.totalDamage).toBe(24);
    expect(active.totalDamage).toBe(43);
  });

  it("applies combo_attack when combo is at least 2", () => {
    const inactive = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.combo_attack], {
      linesCleared: 4,
      backToBackActive: false,
      combo: 1,
    });
    const active = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.combo_attack], {
      linesCleared: 4,
      backToBackActive: false,
      combo: 2,
    });

    expect(inactive).toBe(4);
    expect(active).toBe(5);
  });

  it("applies long_combo_flow when combo is at least 9", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.long_combo_flow], {
      linesCleared: 4,
      backToBackActive: false,
      combo: 9,
    });

    expect(result).toBe(6);
  });

  it("applies new combo relics for threshold, small attack, and low field conditions", () => {
    const combo4 = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.combo_4_bonus], {
      linesCleared: 2,
      backToBackActive: false,
      combo: 4,
    });
    const smallCombo = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.combo_small_attack_bonus], {
      linesCleared: 2,
      backToBackActive: false,
      combo: 2,
    });
    const largeCombo = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.combo_small_attack_bonus], {
      linesCleared: 4,
      backToBackActive: false,
      combo: 2,
    });
    const lowFieldCombo = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.low_field_combo_bonus], {
      linesCleared: 2,
      backToBackActive: false,
      combo: 2,
      fieldHeight: 4,
    });

    expect(combo4).toBe(5);
    expect(smallCombo).toBe(5);
    expect(largeCombo).toBe(4);
    expect(lowFieldCombo).toBe(5);
  });

  it("applies new danger relics for line clear and combo attacks", () => {
    const dangerLine = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.danger_line_bonus], {
      linesCleared: 1,
      backToBackActive: false,
      isDanger: true,
    });
    const dangerCombo = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.danger_combo_power], {
      linesCleared: 1,
      backToBackActive: false,
      isDanger: true,
      combo: 2,
    });
    const safeCombo = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.danger_combo_power], {
      linesCleared: 1,
      backToBackActive: false,
      isDanger: false,
      combo: 2,
    });

    expect(dangerLine).toBe(5);
    expect(dangerCombo).toBe(5);
    expect(safeCombo).toBe(4);
  });

  it("applies hole_tspin_power when holes and T-spin are both present", () => {
    const noHole = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.hole_tspin_power], {
      linesCleared: 2,
      backToBackActive: false,
      holeCount: 0,
      isTSpin: true,
    });
    const active = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.hole_tspin_power], {
      linesCleared: 2,
      backToBackActive: false,
      holeCount: 1,
      isTSpin: true,
    });

    expect(noHole).toBe(4);
    expect(active).toBe(5);
  });

  it("applies low and clean field attack relics", () => {
    const lowField = new EffectResolver().applyAttackModifiers(10, [relicDefinitions.low_field_power], {
      linesCleared: 1,
      backToBackActive: false,
      fieldHeight: 4,
    });
    const cleanField = new EffectResolver().applyAttackModifiers(8, [relicDefinitions.clean_field_power], {
      linesCleared: 1,
      backToBackActive: false,
      fieldHeight: 4,
      holeCount: 0,
    });
    const dirtyField = new EffectResolver().applyAttackModifiers(8, [relicDefinitions.clean_field_power], {
      linesCleared: 1,
      backToBackActive: false,
      fieldHeight: 4,
      holeCount: 1,
    });

    expect(lowField).toBe(12);
    expect(cleanField).toBe(10);
    expect(dirtyField).toBe(8);
  });

  it("applies new Fast relics for fast line, combo, and T-spin attacks", () => {
    const strong = new EffectResolver().applyAttackModifiers(20, [relicDefinitions.fast_strong_attack], {
      linesCleared: 1,
      backToBackActive: false,
      fastChain: 3,
    });
    const combo = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.fast_combo_bonus], {
      linesCleared: 1,
      backToBackActive: false,
      fastChain: 3,
      combo: 2,
    });
    const line = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.fast_line_bonus], {
      linesCleared: 1,
      backToBackActive: false,
      fastChain: 3,
    });
    const tSpin = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.fast_tspin_power], {
      linesCleared: 2,
      backToBackActive: false,
      fastChain: 3,
      isTSpin: true,
    });

    expect(strong).toBe(27);
    expect(combo).toBe(5);
    expect(line).toBe(5);
    expect(tSpin).toBe(5);
  });

  it("can use GarbageQueue total amount as pending garbage context", () => {
    const queue = new GarbageQueue({}, [
      { id: "garbage_1", amount: 2, source: "test", remainingDelay: 1 },
      { id: "garbage_2", amount: 3, source: "test", remainingDelay: 2 },
    ]);

    expect(queue.getTotalAmount()).toBe(5);
  });

  it("keeps equals boolean conditions compatible with existing relic definitions", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.danger_power], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: true,
    });

    expect(result).toBe(6);
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
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.high_stack_counter], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: true,
      isTSpin: false,
    });

    expect(result).toBe(5);
  });

  it("applies high_stack_counter for Danger T-spin", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.high_stack_counter], {
      linesCleared: 2,
      backToBackActive: false,
      isDanger: true,
      isTSpin: true,
    });

    expect(result).toBe(5);
  });

  it("does not apply high_stack_counter outside Danger", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.high_stack_counter], {
      linesCleared: 4,
      backToBackActive: false,
      isDanger: false,
      isTSpin: true,
    });

    expect(result).toBe(4);
  });

  it("applies combo_attack when comboBonus is at least 1", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.combo_attack], {
      linesCleared: 4,
      backToBackActive: false,
      combo: 0,
      comboBonus: 1,
    });

    expect(result).toBe(5);
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
