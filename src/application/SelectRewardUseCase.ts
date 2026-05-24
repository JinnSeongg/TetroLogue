import type { GameAppState } from "./GameAppState";
import { RewardSelector } from "../domain/reward/RewardSelector";

export class SelectRewardUseCase {
  execute(state: GameAppState, rewardId: string): GameAppState {
    if (!state.reward || !state.run) return state;
    const reward = state.reward.choices.find((choice) => choice.id === rewardId);
    if (!reward) return state;
    const inventory = new RewardSelector().select(reward, state.run.relicInventory);
    return {
      ...state,
      scene: "nodeMap",
      run: { ...state.run, relicInventory: inventory, status: "map" },
      combat: undefined,
      reward: undefined,
      events: [...state.events, { type: "RewardSelected", rewardId }],
    };
  }
}
