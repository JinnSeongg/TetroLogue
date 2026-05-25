import type { RewardDefinition } from "../domain/reward/RewardDefinition";
import { relicDefinitions } from "./relicDefinitions";

export const relicRewardTable: RewardDefinition[] = Object.values(relicDefinitions).map((relic) => ({
  id: `reward_${relic.id}`,
  type: "relic",
  relicId: relic.id,
  label: relic.name,
}));

export const shopRelicRewardTable: RewardDefinition[] = Object.values(relicDefinitions).map((relic) => ({
  id: `shop_${relic.id}`,
  type: "relic",
  relicId: relic.id,
  label: relic.name,
}));
