import type { GameAppState } from "./GameAppState";
import { findNode } from "../domain/run/NodeMap";

export class EnterNodeUseCase {
  execute(state: GameAppState, nodeId: string): GameAppState {
    if (!state.run) return state;
    const node = findNode(state.run.nodeMap, nodeId);
    if (!node) return state;
    return {
      ...state,
      scene: node.type === "combat" || node.type === "elite" || node.type === "boss" ? "combat" : "nodeMap",
      run: {
        ...state.run,
        currentNodeId: nodeId,
        status: node.type === "combat" || node.type === "elite" || node.type === "boss" ? "combat" : "map",
      },
      events: [...state.events, { type: "NodeEntered", nodeId }],
    };
  }
}
