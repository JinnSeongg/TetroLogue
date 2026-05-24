import type { GameAppState } from "./GameAppState";
import { findNode } from "../domain/run/NodeMap";

export class MoveToNextNodeUseCase {
  execute(state: GameAppState, nodeId: string): GameAppState {
    if (!state.run) return state;
    const current = findNode(state.run.nodeMap, state.run.currentNodeId);
    if (!current?.nextNodeIds.includes(nodeId)) return state;
    const nextNode = findNode(state.run.nodeMap, nodeId);
    if (!nextNode) return state;
    return {
      ...state,
      run: {
        ...state.run,
        currentNodeId: nodeId,
        status: nextNode.type === "combat" || nextNode.type === "elite" || nextNode.type === "boss" ? "combat" : "map",
        nodeMap: {
          nodes: state.run.nodeMap.nodes.map((node) =>
            node.id === state.run?.currentNodeId ? { ...node, completed: true } : node,
          ),
        },
      },
      scene: nextNode.type === "combat" || nextNode.type === "elite" || nextNode.type === "boss" ? "combat" : "nodeMap",
      combat: undefined,
      reward: undefined,
      runResult: undefined,
      events: [...state.events, { type: "NodeEntered", nodeId }],
    };
  }
}
