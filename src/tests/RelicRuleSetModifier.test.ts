import { describe, expect, it } from "vitest";
import { resolveRuntimeRuleSet } from "../application/ConditionalRuleSet";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { relicDefinitions } from "../data/relicDefinitions";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { EffectResolver } from "../domain/relic/EffectResolver";
import type { CombatState } from "../domain/combat/CombatState";
import { Board } from "../domain/tetris/Board";
import type { Cell } from "../domain/tetris/Cell";
import { standardRuleSet, type TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";

describe("Relic rule set modifiers", () => {
  it("keeps values identical when no relics are owned", () => {
    const baseRuleSet = createBaseRuleSet();
    const result = new EffectResolver().resolveEffectiveRuleSet(baseRuleSet, []);

    expect(result).toEqual(baseRuleSet);
    expect(result).not.toBe(baseRuleSet);
  });

  it("applies gentle_fall as a 1.2x gravity interval multiplier", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.gentle_fall]);

    expect(result.gravityMs).toBe(1080);
  });

  it("applies delayed_lock as +200ms lock delay", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.delayed_lock]);

    expect(result.lockDelayMs).toBe(700);
  });

  it("applies stable beginner rule relics to effective rule set", () => {
    const lockDelay = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.stable_lock_delay]);
    const gravityLock = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.stable_gravity_lock]);

    expect(lockDelay.lockDelayMs).toBe(650);
    expect(gravityLock.gravityMs).toBe(1035);
    expect(gravityLock.lockDelayMs).toBe(600);
  });

  it("applies instant_soft_drop as an instant soft drop rule flag", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.instant_soft_drop]);

    expect(result.instantSoftDrop).toBe(true);
  });

  it("applies compressed_preview and clamps next preview count to at least 1", () => {
    const normal = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.compressed_preview]);
    const clamped = new EffectResolver().resolveEffectiveRuleSet({ ...createBaseRuleSet(), nextPreviewCount: 2 }, [relicDefinitions.compressed_preview]);

    expect(normal.nextPreviewCount).toBe(3);
    expect(clamped.nextPreviewCount).toBe(1);
  });

  it("applies Next-down flat relics as -1 next preview count", () => {
    const flatBonus = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.next_down_flat_bonus]);
    const smallLineBonus = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.next_down_small_line_bonus]);

    expect(flatBonus.nextPreviewCount).toBe(4);
    expect(smallLineBonus.nextPreviewCount).toBe(4);
  });

  it("applies wide_next as +1 next preview count", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.wide_next]);

    expect(result.nextPreviewCount).toBe(6);
  });

  it("applies deep_next as +2 next preview count", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.deep_next]);

    expect(result.nextPreviewCount).toBe(7);
  });

  it("applies no_hold_focus as a hold disable override", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.no_hold_focus]);

    expect(result.holdEnabled).toBe(false);
  });

  it("applies extra_hold_slot as +1 max hold slot", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.extra_hold_slot]);

    expect(result.maxHoldSlots).toBe(2);
  });

  it("applies forced_speed as a 0.75x gravity interval multiplier", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.forced_speed]);

    expect(result.gravityMs).toBe(675);
  });

  it("applies overheated_drop as -300ms lock delay", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.overheated_drop]);

    expect(result.lockDelayMs).toBe(200);
  });

  it("applies quick_judgement as -300ms lock delay", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.quick_judgement]);

    expect(result.lockDelayMs).toBe(200);
  });

  it("applies fast_power as +0.005 speed bonus per stack", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.fast_power]);

    expect(result.speedBonusPerStack).toBe(0.015);
    expect(result.speedBonusCap).toBe(20);
  });

  it("applies Fast efficiency relics as +0.005 speed bonus per stack each", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [
      relicDefinitions.fast_power,
      relicDefinitions.fast_tspin_power,
      relicDefinitions.fast_efficiency_3,
    ]);

    expect(result.speedBonusPerStack).toBe(0.025);
    expect(result.speedBonusCap).toBe(20);
  });

  it("applies Fast cap relics as +10 speed bonus cap each", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [
      relicDefinitions.fast_chain_power,
      relicDefinitions.fast_combo_bonus,
      relicDefinitions.fast_line_bonus,
    ]);

    expect(result.speedBonusPerStack).toBe(0.01);
    expect(result.speedBonusCap).toBe(50);
  });

  it("does not mutate the base rule set", () => {
    const baseRuleSet = createBaseRuleSet();
    const before = { ...baseRuleSet };

    const result = new EffectResolver().resolveEffectiveRuleSet(baseRuleSet, [
      relicDefinitions.gentle_fall,
      relicDefinitions.delayed_lock,
      relicDefinitions.compressed_preview,
      relicDefinitions.no_hold_focus,
      relicDefinitions.fast_power,
    ]);

    expect(baseRuleSet).toEqual(before);
    expect(result).not.toEqual(baseRuleSet);
  });

  it("reports applied rule relic ids when details are requested", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(
      createBaseRuleSet(),
      [relicDefinitions.gentle_fall, relicDefinitions.no_hold_focus],
      { includeDetails: true },
    );

    expect(result.appliedRuleRelicIds).toEqual(["gentle_fall", "no_hold_focus"]);
    expect(result.baseRuleSet).toEqual(createBaseRuleSet());
  });

  it("does not apply conditional Hole rule modifiers when holeCount is 0", () => {
    const result = new EffectResolver().resolveConditionalRuleSet(
      createBaseRuleSet(),
      [relicDefinitions.hole_gravity_relief, relicDefinitions.hole_lock_delay],
      { linesCleared: 0, backToBackActive: false, holeCount: 0 },
    );

    expect(result).toEqual(createBaseRuleSet());
  });

  it("applies Hole gravity relief when holeCount is at least 1", () => {
    const result = new EffectResolver().resolveConditionalRuleSet(createBaseRuleSet(), [relicDefinitions.hole_gravity_relief], {
      linesCleared: 0,
      backToBackActive: false,
      holeCount: 1,
    });

    expect(result.gravityMs).toBe(990);
  });

  it("multiplies stacked Hole gravity relief modifiers when both conditions match", () => {
    const result = new EffectResolver().resolveConditionalRuleSet(
      createBaseRuleSet(),
      [relicDefinitions.hole_gravity_relief, relicDefinitions.hole_gravity_relief_2],
      { linesCleared: 0, backToBackActive: false, holeCount: 10 },
    );

    expect(result.gravityMs).toBe(1287);
  });

  it("applies Hole lock delay when holeCount is at least 3", () => {
    const result = new EffectResolver().resolveConditionalRuleSet(createBaseRuleSet(), [relicDefinitions.hole_lock_delay], {
      linesCleared: 0,
      backToBackActive: false,
      holeCount: 3,
    });

    expect(result.lockDelayMs).toBe(600);
  });

  it("recalculates conditional RuleSet from base effective RuleSet without accumulating", () => {
    const started = withBoard(startCombatWithRelics(901, ["hole_gravity_relief"]), boardWithHoles(1));
    const first = resolveRuntimeRuleSet(started.combat!);
    const second = resolveRuntimeRuleSet({ ...started.combat!, ruleSet: first });

    expect(first.gravityMs).toBe(990);
    expect(second.gravityMs).toBe(990);
  });

  it("combines passive RuleSet relics with conditional Hole RuleSet relics", () => {
    const started = withBoard(startCombatWithRelics(902, ["stable_gravity_lock", "hole_gravity_relief", "hole_lock_delay"]), boardWithHoles(3));
    const runtimeRuleSet = resolveRuntimeRuleSet(started.combat!);

    expect(started.combat?.baseRuleSet?.gravityMs).toBe(1035);
    expect(runtimeRuleSet.gravityMs).toBe(1139);
    expect(runtimeRuleSet.lockDelayMs).toBe(700);
  });
});

function createBaseRuleSet(): TetrisRuleSet {
  return { ...standardRuleSet };
}

function startCombatWithRelics(seed: number, relicIds: string[]) {
  const run = new StartRunUseCase().execute();
  const withRelics = run.run
    ? {
        ...run,
        run: {
          ...run.run,
          relicInventory: relicIds.reduce((inventory, relicId) => inventory.add(relicId), run.run.relicInventory),
        },
      }
    : run;
  return new StartCombatUseCase(new SeededRandomProvider(seed)).execute(withRelics);
}

function withBoard<T extends { combat?: CombatState }>(state: T, board: Board): T {
  if (!state.combat) return state;
  return { ...state, combat: { ...state.combat, player: { ...state.combat.player, board } } };
}

function boardWithHoles(holeCount: number): Board {
  const rows = Array.from({ length: 20 }, () => ".".repeat(10));
  rows[18] = "X".repeat(Math.max(0, Math.min(10, holeCount))) + ".".repeat(Math.max(0, 10 - holeCount));
  rows[19] = ".".repeat(Math.max(0, Math.min(10, holeCount))) + "X".repeat(Math.max(0, 10 - holeCount));
  return new Board(
    10,
    20,
    rows.map((row) => [...row].map((value): Cell => (value === "X" ? { filled: true, pieceType: "I" } : { filled: false }))),
  );
}
