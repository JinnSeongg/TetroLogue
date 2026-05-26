import type { RewardDefinition } from "../domain/reward/RewardDefinition";
import { relicDefinitions } from "./relicDefinitions";

const combatRewardRelics = Object.values(relicDefinitions).filter(
  (relic) => relic.obtainSource === "combatReward" || relic.obtainSource === "both",
);

const shopRewardRelics = Object.values(relicDefinitions).filter(
  (relic) => relic.obtainSource === "shopOnly" || relic.obtainSource === "both",
);

export const relicRewardTable: RewardDefinition[] = combatRewardRelics.map((relic) => ({
  id: `reward_${relic.id}`,
  type: "relic",
  relicId: relic.id,
  label: relic.name,
}));

export const shopRelicRewardTable: RewardDefinition[] = shopRewardRelics.map((relic) => ({
  id: `shop_${relic.id}`,
  type: "relic",
  relicId: relic.id,
  label: relic.name,
}));
