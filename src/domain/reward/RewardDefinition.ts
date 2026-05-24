import type { Id } from "../shared/Id";

export type RewardDefinition = {
  id: Id;
  type: "relic";
  relicId: Id;
  label: string;
};
