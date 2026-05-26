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
  });

  it("excludes shopOnly relics from the combat reward table", () => {
    expect(combatRelicIds()).not.toContain("gentle_fall");
    expect(combatRelicIds()).not.toContain("holdless_focus");
  });

  it("includes shopOnly relics in the shop reward table", () => {
    expect(shopRelicIds()).toContain("gentle_fall");
    expect(shopRelicIds()).toContain("holdless_focus");
  });

  it("excludes disabled legacy relics from every reward table", () => {
    expect(combatRelicIds()).not.toContain("relic_tetris_power");
    expect(shopRelicIds()).not.toContain("relic_tetris_power");
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
