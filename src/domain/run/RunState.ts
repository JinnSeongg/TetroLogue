import type { RelicInventory } from "../relic/RelicInventory";
import type { NodeMap } from "./NodeMap";
import type { RunProgressState } from "./RunProgressState";
import type { DifficultyId } from "../balance/balanceTypes";

export type RunState = {
  id: string;
  nodeMap: NodeMap;
  currentNodeId: string;
  progress: RunProgressState;
  difficultyId?: DifficultyId;
  relicInventory: RelicInventory;
  status: "map" | "combat" | "event" | "shop" | "reward" | "complete";
};
