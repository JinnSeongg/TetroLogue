import type { GameAppState } from "./GameAppState";
import { RunGenerator } from "../domain/run/RunGenerator";
import { RelicInventory } from "../domain/relic/RelicInventory";
import { relicDefinitions } from "../data/relicDefinitions";

export class StartRunUseCase {
  execute(): GameAppState {
    const nodeMap = new RunGenerator().generate();
    return {
      scene: "nodeMap",
      run: {
        id: `run_${Date.now()}`,
        nodeMap,
        currentNodeId: "node_start",
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
