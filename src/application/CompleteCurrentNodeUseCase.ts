import type { GameAppState } from "./GameAppState";
import { floorNodeId } from "../domain/run/RunGenerator";

export class CompleteCurrentNodeUseCase {
  execute(state: GameAppState): GameAppState {
    if (!state.run) return state;
    const { progress } = state.run;
    if (progress.currentFloor >= progress.maxFloor) {
      return {
        ...state,
        scene: "runResult",
        combat: undefined,
        reward: undefined,
        run: { ...state.run, status: "complete" },
        runResult: { result: "victory", title: "Run Complete", message: "The final boss falls. The run is clear." },
      };
    }

    const nextFloor = Math.min(progress.maxFloor, progress.currentFloor + 1);
    return {
      ...state,
      scene: "nodeMap",
      combat: undefined,
      reward: undefined,
      runResult: undefined,
      run: {
        ...state.run,
        currentNodeId: floorNodeId(nextFloor),
        progress: { ...progress, currentFloor: nextFloor },
        status: "map",
        nodeMap: {
          nodes: state.run.nodeMap.nodes.map((node) =>
            node.floor === progress.currentFloor ? { ...node, completed: true } : node,
          ),
        },
      },
    };
  }
}
