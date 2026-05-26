import type { RelicInventory } from "../relic/RelicInventory";
import type { RandomProvider } from "../shared/RandomProvider";
import type { RewardDefinition } from "./RewardDefinition";

export class RewardGenerator {
  constructor(
    private readonly rewards: RewardDefinition[],
    private readonly random: RandomProvider,
  ) {}

  generate(count = 3, inventory?: RelicInventory): RewardDefinition[] {
    const rewards = inventory ? this.rewards.filter((reward) => inventory.canAdd(reward.relicId)) : this.rewards;
    return this.random.shuffle([...rewards]).slice(0, count);
  }
}
