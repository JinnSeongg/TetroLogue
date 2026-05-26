import { describe, expect, it } from "vitest";
import { relicDefinitions } from "../data/relicDefinitions";
import { RelicInventory } from "../domain/relic/RelicInventory";
import type { RelicDefinition } from "../domain/relic/RelicDefinition";

describe("RelicInventory", () => {
  it("does not add more relics than maxStacks allows", () => {
    const inventory = new RelicInventory([], relicDefinitions).add("tetris_power").add("tetris_power");

    expect(inventory.getStack("tetris_power")).toBe(1);
  });

  it("allows additional stacks until maxStacks is reached", () => {
    const inventory = new RelicInventory([], stackableDefinitions)
      .add("stackable_power")
      .add("stackable_power")
      .add("stackable_power");

    expect(inventory.getStack("stackable_power")).toBe(2);
  });

  it("treats invalid maxStacks as not addable", () => {
    const inventory = new RelicInventory([], invalidStackDefinitions).add("invalid_stack");

    expect(inventory.getStack("invalid_stack")).toBe(0);
    expect(inventory.canAdd("invalid_stack")).toBe(false);
  });
});

const stackableDefinitions: Record<string, RelicDefinition> = {
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

const invalidStackDefinitions: Record<string, RelicDefinition> = {
  invalid_stack: {
    id: "invalid_stack",
    name: "Invalid Stack",
    description: "Test fixture.",
    category: "legacy",
    rarity: "common",
    maxStacks: 0,
    obtainSource: "disabled",
    modifiers: [],
  },
};
