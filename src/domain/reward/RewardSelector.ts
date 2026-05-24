import type { RelicInventory } from "../relic/RelicInventory";
import type { RewardDefinition } from "./RewardDefinition";

export class RewardSelector {
  select(reward: RewardDefinition, inventory: RelicInventory): RelicInventory {
    if (reward.type === "relic") return inventory.add(reward.relicId);
    return inventory;
  }
}
