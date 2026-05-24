import { describe, expect, it } from "vitest";
import { GameFlowController } from "../application/GameFlowController";
import type { GameAppState } from "../application/GameAppState";
import type { SaveRunRepository } from "../application/ports/SaveRunRepository";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

class MemoryRepository implements SaveRunRepository {
  state?: GameAppState;

  save(state: GameAppState): void {
    this.state = state;
  }

  load(): GameAppState | undefined {
    return this.state;
  }
}

describe("GameFlowController", () => {
  it("plays through menu, combat, reward, map, boss, and run result", () => {
    const controller = new GameFlowController(new SeededRandomProvider(20), new MemoryRepository());

    let state = controller.createInitialState();
    expect(state.scene).toBe("mainMenu");

    state = controller.startRun();
    expect(state.scene).toBe("nodeMap");

    state = controller.enterNode(state, "node_1b");
    expect(state.scene).toBe("combat");

    state = defeatEnemyWithTetrises(controller, state);
    expect(state.scene).toBe("reward");

    const rewardId = state.reward?.choices[0].id;
    if (!rewardId) throw new Error("Expected reward choices");
    state = controller.selectReward(state, rewardId);
    expect(state.scene).toBe("nodeMap");

    state = controller.enterNode(state, "node_2b");
    state = defeatEnemyWithTetrises(controller, state);
    const secondRewardId = state.reward?.choices[0].id;
    if (!secondRewardId) throw new Error("Expected second reward choices");
    state = controller.selectReward(state, secondRewardId);

    state = controller.enterNode(state, "node_elite");
    state = defeatEnemyWithTetrises(controller, state);
    const eliteRewardId = state.reward?.choices[0].id;
    if (!eliteRewardId) throw new Error("Expected elite reward choices");
    state = controller.selectReward(state, eliteRewardId);

    state = controller.enterNode(state, "node_boss");
    state = defeatEnemyWithTetrises(controller, state);

    expect(state.scene).toBe("runResult");
    expect(state.runResult?.result).toBe("victory");
    expect(state.run?.relicInventory.relics.length).toBeGreaterThanOrEqual(3);
  });
});

function defeatEnemyWithTetrises(controller: GameFlowController, state: GameAppState): GameAppState {
  let next = state;
  for (let index = 0; index < 8 && next.scene === "combat"; index += 1) {
    next = controller.debugLineClear(next, 4);
  }
  return next;
}
