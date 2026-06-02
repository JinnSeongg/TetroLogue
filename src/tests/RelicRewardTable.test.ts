import { describe, expect, it } from "vitest";
import { relicDefinitions } from "../data/relicDefinitions";
import { relicRewardTable, shopRelicRewardTable } from "../data/rewardTables";
import { RelicInventory } from "../domain/relic/RelicInventory";
import type { RelicDefinition } from "../domain/relic/RelicDefinition";
import { RewardGenerator } from "../domain/reward/RewardGenerator";
import type { RewardDefinition } from "../domain/reward/RewardDefinition";
import type { RandomProvider } from "../domain/shared/RandomProvider";

describe("Relic reward tables", () => {
  it("includes combatReward relics in the combat reward table", () => {
    expect(combatRelicIds()).toContain("tetris_power");
    expect(combatRelicIds()).toContain("tsd_tst_power");
    expect(combatRelicIds()).toContain("fast_tspin_power");
    expect(combatRelicIds()).toContain("fast_efficiency_3");
    expect(combatRelicIds()).toContain("low_combo_bonus");
    expect(combatRelicIds()).toContain("boss_tetris_power");
    expect(combatRelicIds()).toContain("boss_tspin_power");
    expect(combatRelicIds()).toContain("boss_b2b_power");
    expect(combatRelicIds()).toContain("boss_combo_power");
    expect(combatRelicIds()).toContain("tetris_followup_power");
    expect(combatRelicIds()).toContain("tspin_followup_power");
    expect(combatRelicIds()).toContain("pc_followup_bonus");
    expect(combatRelicIds()).toContain("pc_timed_base_power");
    expect(combatRelicIds()).toContain("stable_lock_delay");
    expect(combatRelicIds()).toContain("stable_gravity_lock");
    expect(combatRelicIds()).toContain("small_line_bonus");
    expect(combatRelicIds()).toContain("double_line_bonus");
    expect(combatRelicIds()).toContain("small_line_tetris_tradeoff");
    expect(combatRelicIds()).toContain("small_line_tspin_tradeoff");
    expect(combatRelicIds()).toContain("basic_line_clear_focus");
    expect(combatRelicIds()).toContain("b2b_power_2");
    expect(combatRelicIds()).toContain("b2b_under_10_power");
  });

  it("excludes shopOnly relics from the combat reward table", () => {
    expect(combatRelicIds()).not.toContain("gentle_fall");
    expect(combatRelicIds()).not.toContain("no_hold_focus");
    expect(combatRelicIds()).not.toContain("instant_soft_drop");
    expect(combatRelicIds()).not.toContain("next_down_flat_bonus");
    expect(combatRelicIds()).not.toContain("next_down_small_line_bonus");
  });

  it("includes shopOnly relics in the shop reward table", () => {
    expect(shopRelicIds()).toContain("gentle_fall");
    expect(shopRelicIds()).toContain("no_hold_focus");
    expect(shopRelicIds()).toContain("wide_next");
    expect(shopRelicIds()).toContain("forced_speed");
    expect(shopRelicIds()).toContain("instant_soft_drop");
    expect(shopRelicIds()).toContain("next_down_flat_bonus");
    expect(shopRelicIds()).toContain("next_down_small_line_bonus");
  });

  it("excludes disabled legacy relics from every reward table", () => {
    expect(combatRelicIds()).not.toContain("relic_tetris_power");
    expect(shopRelicIds()).not.toContain("relic_tetris_power");
  });

  it("excludes every disabled relic from combat and shop reward tables", () => {
    const disabledRelicIds = Object.values(relicDefinitions)
      .filter((relic) => relic.obtainSource === "disabled")
      .map((relic) => String(relic.id));

    for (const id of disabledRelicIds) {
      expect(combatRelicIds()).not.toContain(id);
      expect(shopRelicIds()).not.toContain(id);
    }
  });

  it("excludes every Danger and Garbage relic from reward tables", () => {
    const excludedCategoryIds = Object.values(relicDefinitions)
      .filter((relic) => relic.category === "danger" || relic.category === "garbage")
      .map((relic) => String(relic.id));

    expect(excludedCategoryIds).toEqual(expect.arrayContaining(["danger_power", "garbage_absorb"]));
    for (const id of excludedCategoryIds) {
      expect(relicDefinitions[id].obtainSource).toBe("disabled");
      expect(combatRelicIds()).not.toContain(id);
      expect(shopRelicIds()).not.toContain(id);
    }
  });

  it("excludes disabled planned relics from every reward table", () => {
    const disabledIds = [
      "danger_power",
      "high_stack_counter",
      "danger_line_bonus",
      "danger_combo_power",
      "garbage_absorb",
      "garbage_surge",
      "quick_judgement",
      "holdless_focus",
      "extra_hold_slot",
    ];

    for (const id of disabledIds) {
      expect(relicDefinitions[id].obtainSource).toBe("disabled");
      expect(combatRelicIds()).not.toContain(id);
      expect(shopRelicIds()).not.toContain(id);
    }
  });

  it("excludes temporarily disabled hold slot relic from every reward table", () => {
    expect(relicDefinitions.extra_hold_slot.obtainSource).toBe("disabled");
    expect(combatRelicIds()).not.toContain("extra_hold_slot");
    expect(shopRelicIds()).not.toContain("extra_hold_slot");
  });

  it("defines reward metadata for every relic", () => {
    for (const relic of Object.values(relicDefinitions)) {
      expect(relic.category).toBeDefined();
      expect(relic.rarity).toBeDefined();
      expect(relic.maxStacks).toBeGreaterThan(0);
      expect(relic.obtainSource).toBeDefined();
    }
  });

  it("excludes maxStacks 1 relics that are already owned from generated rewards", () => {
    const inventory = new RelicInventory([], relicDefinitions).add("tetris_power");

    const choices = new RewardGenerator(relicRewardTable, stableRandom).generate(relicRewardTable.length, inventory);

    expect(choices.map((choice) => choice.relicId)).not.toContain("tetris_power");
  });

  it("keeps maxStacks 2 relics available at 1 stack and excludes them at 2 stacks", () => {
    const definitions: Record<string, RelicDefinition> = {
      stackable_power: {
        id: "stackable_power",
        name: "Stackable Power",
        description: "Test fixture.",
        category: "tetris",
        rarity: "common",
        maxStacks: 2,
        obtainSource: "combatReward",
        modifiers: [],
      },
    };
    const rewards: RewardDefinition[] = [{ id: "reward_stackable_power", type: "relic", relicId: "stackable_power", label: "Stackable Power" }];
    const oneStack = new RelicInventory([], definitions).add("stackable_power");
    const twoStacks = oneStack.add("stackable_power");

    expect(new RewardGenerator(rewards, stableRandom).generate(3, oneStack).map((choice) => choice.relicId)).toContain("stackable_power");
    expect(new RewardGenerator(rewards, stableRandom).generate(3, twoStacks)).toHaveLength(0);
  });

  it("returns only available rewards when the candidate pool is smaller than the requested count", () => {
    const inventory = new RelicInventory([], relicDefinitions).add("tetris_power");
    const rewards: RewardDefinition[] = [
      { id: "reward_tetris_power", type: "relic", relicId: "tetris_power", label: "Tetris Power" },
      { id: "reward_tetris_flat_bonus", type: "relic", relicId: "tetris_flat_bonus", label: "Tetris Flat Bonus" },
    ];

    const choices = new RewardGenerator(rewards, stableRandom).generate(3, inventory);

    expect(choices.map((choice) => choice.relicId)).toEqual(["tetris_flat_bonus"]);
  });
});

function combatRelicIds() {
  return relicRewardTable.map((reward) => reward.relicId);
}

function shopRelicIds() {
  return shopRelicRewardTable.map((reward) => reward.relicId);
}

const stableRandom: RandomProvider = {
  next: () => 0,
  nextInt: () => 0,
  shuffle: (items) => items,
};
