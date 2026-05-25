import type { GameAppState } from "./GameAppState";
import { createNodeMapFromFloorNodes, floorNodeId } from "../domain/run/RunGenerator";
import { RelicInventory } from "../domain/relic/RelicInventory";
import { relicDefinitions } from "../data/relicDefinitions";
import { createRunProgressState, generateRunNodes } from "../domain/run/RunProgression";
import type { RandomProvider } from "../domain/shared/RandomProvider";

export class StartRunUseCase {
  constructor(private readonly random?: Pick<RandomProvider, "next">) {}

  execute(): GameAppState {
    const seededProgress = createRunProgressState(generateRunNodes({ random: this.random }));
    const nodeMap = createNodeMapFromFloorNodes(seededProgress.nodes);
    return {
      scene: "nodeMap",
      run: {
        id: `run_${Date.now()}`,
        nodeMap,
        currentNodeId: floorNodeId(seededProgress.currentFloor),
        progress: seededProgress,
        relicInventory: new RelicInventory([], relicDefinitions),
        status: "map",
      },
      combat: undefined,
      reward: undefined,
      runResult: undefined,
      events: [],
    };
  }
}
