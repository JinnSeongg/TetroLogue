import type { RelicInventory } from "../relic/RelicInventory";
import type { NodeMap } from "./NodeMap";

export type RunState = {
  id: string;
  nodeMap: NodeMap;
  currentNodeId: string;
  relicInventory: RelicInventory;
  status: "map" | "combat" | "reward" | "complete";
};
