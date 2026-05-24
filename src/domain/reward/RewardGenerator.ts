import type { RandomProvider } from "../shared/RandomProvider";
import type { RewardDefinition } from "./RewardDefinition";

export class RewardGenerator {
  constructor(
    private readonly rewards: RewardDefinition[],
    private readonly random: RandomProvider,
  ) {}

  generate(count = 3): RewardDefinition[] {
    return this.random.shuffle([...this.rewards]).slice(0, count);
  }
}
