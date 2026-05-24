import type { StageNode } from "./StageNode";

export type NodeMap = {
  nodes: StageNode[];
};

export const findNode = (map: NodeMap, nodeId: string): StageNode | undefined => map.nodes.find((node) => node.id === nodeId);
