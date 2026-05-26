import type { GameAppState } from "./GameAppState";
import { createNodeMapFromFloorNodes, floorNodeId } from "../domain/run/RunGenerator";
import { RelicInventory } from "../domain/relic/RelicInventory";
import { relicDefinitions } from "../data/relicDefinitions";
import { createRunProgressState, generateRunNodes } from "../domain/run/RunProgression";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import type { DifficultyId } from "../domain/balance/balanceTypes";
import { selectEnemyForFloor } from "../data/enemySelector";

export class StartRunUseCase {
  constructor(private readonly random?: Pick<RandomProvider, "next">) {}

  execute(difficultyId: DifficultyId = "standard"): GameAppState {
    const seededProgress = createRunProgressState(
      generateRunNodes({
        random: this.random,
        difficultyId,
        selectEnemyIdForFloor: (floor, selectedDifficultyId, rng, recentEnemyIds) =>
          selectEnemyForFloor(floor, selectedDifficultyId, rng, recentEnemyIds).id,
      }),
    );
    const nodeMap = createNodeMapFromFloorNodes(seededProgress.nodes);
    return {
      scene: "nodeMap",
      run: {
        id: `run_${Date.now()}`,
        nodeMap,
        currentNodeId: floorNodeId(seededProgress.currentFloor),
        progress: seededProgress,
        difficultyId,
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
