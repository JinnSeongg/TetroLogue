export type NodeType = "battle" | "event" | "shop" | "boss" | "finalBoss";

export type NodeStatus = "completed" | "current" | "future";

export type FloorNode = {
  floor: number;
  type: NodeType;
  enemyPoolId?: string;
  bossId?: string;
  rewardTableId?: string;
  shopPoolId?: string;
};

export type RunProgressState = {
  currentFloor: number;
  maxFloor: number;
  nodes: FloorNode[];
};
