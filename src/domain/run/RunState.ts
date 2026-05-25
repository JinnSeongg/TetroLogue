import type { RelicInventory } from "../relic/RelicInventory";
import type { NodeMap } from "./NodeMap";
import type { RunProgressState } from "./RunProgressState";

export type RunState = {
  id: string;
  nodeMap: NodeMap;
  currentNodeId: string;
  progress: RunProgressState;
  relicInventory: RelicInventory;
  status: "map" | "combat" | "event" | "shop" | "reward" | "complete";
};
