import { describe, expect, it } from "vitest";
import { AttackCalculator } from "../domain/combat/AttackCalculator";
import { EffectResolver } from "../domain/relic/EffectResolver";
import { noSpinResult } from "../domain/tetris/SpinDetector";
import { relicDefinitions } from "../data/relicDefinitions";
import { GarbageQueue } from "../domain/combat/GarbageQueue";
import type { RelicDefinition } from "../domain/relic/RelicDefinition";

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
      4,
      [relicDefinitions.tetris_power, relicDefinitions.tetris_flat_bonus],
      {
        linesCleared: 4,
        backToBackActive: false,
      },
      { includeDetails: true },
    );

    expect(result.preRelicAttack).toBe(4);
    expect(result.attack).toBe(6);
    expect(result.relicAttackBonus).toBe(2);
    expect(result.appliedRelicIds).toEqual(["tetris_power", "tetris_flat_bonus"]);
  });

  it("applies the representative Tetris condition relic", () => {
    const result = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.tetris_overwhelm], {
      linesCleared: 4,
      backToBackActive: false,
    });

    expect(result).toBe(6);
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

  it("applies fast_power only when fast context is true", () => {
    const resolver = new EffectResolver();
    const normal = resolver.applyAttackModifiers(4, [relicDefinitions.fast_power], {
      linesCleared: 4,
      backToBackActive: false,
      isFast: false,
    });
    const fast = resolver.applyAttackModifiers(4, [relicDefinitions.fast_power], {
      linesCleared: 4,
      backToBackActive: false,
      isFast: true,
    });

    expect(normal).toBe(4);
    expect(fast).toBe(5);
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
    const normal = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.spin_pierce], {
      linesCleared: 4,
      backToBackActive: false,
      isTSpin: false,
    });
    const tSpin = new EffectResolver().applyAttackModifiers(4, [relicDefinitions.spin_pierce], {
      linesCleared: 2,
      backToBackActive: false,
      isTSpin: true,
    });

    expect(normal).toBe(4);
    expect(tSpin).toBe(5);
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
