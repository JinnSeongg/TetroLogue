import type { Id } from "../shared/Id";

export type NodeType = "start" | "combat" | "elite" | "event" | "shop" | "boss";

export type StageNode = {
  id: Id;
  type: NodeType;
  label: string;
  enemyId?: Id;
  nextNodeIds: Id[];
  completed: boolean;
};
