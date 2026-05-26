import type { Id } from "../shared/Id";
import type { Modifier } from "./Modifier";

export type RelicCategory =
  | "tetris"
  | "spin"
  | "b2b"
  | "combo"
  | "danger"
  | "hole"
  | "perfectClear"
  | "speed"
  | "survival"
  | "garbage"
  | "rule"
  | "nextHold"
  | "random"
  | "legacy";

export type RelicRarity = "common" | "uncommon" | "rare" | "epic";

export type RelicObtainSource = "combatReward" | "shopOnly" | "both" | "disabled";

export type RelicDefinition = {
  id: Id;
  name: string;
  description: string;
  category: RelicCategory;
  rarity: RelicRarity;
  maxStacks: number;
  obtainSource: RelicObtainSource;
  tags?: string[];
  modifiers: Modifier[];
};
