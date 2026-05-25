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
  it("plays through the current floor, reward, next floor, and final clear", () => {
    const controller = new GameFlowController(new SeededRandomProvider(20), new MemoryRepository());

    let state = controller.createInitialState();
    expect(state.scene).toBe("mainMenu");

    state = controller.startRun();
    expect(state.scene).toBe("nodeMap");
    expect(state.run?.progress.currentFloor).toBe(1);

    state = controller.enterNode(state, "floor_2");
    expect(state.scene).toBe("nodeMap");

    state = controller.enterNode(state, state.run?.currentNodeId ?? "");
    expect(state.scene).toBe("combat");

    state = defeatEnemyWithTetrises(controller, state);
    expect(state.scene).toBe("reward");
    expect(state.combat?.lastClearResult?.displayName).toBe("Tetris");
    expect(state.combat?.lastFeedbackEvent?.clearName).toBe("Tetris");
    expect(state.combat?.lastFeedbackEvent?.intensity).toBe("high");
    expect(state.events.some((event) => event.type === "CombatFeedback")).toBe(true);

    const rewardId = state.reward?.choices[0].id;
    if (!rewardId) throw new Error("Expected reward choices");
    state = controller.selectReward(state, rewardId);
    expect(state.scene).toBe("nodeMap");
    expect(state.run?.progress.currentFloor).toBe(2);

    state = {
      ...state,
      run: state.run
        ? {
            ...state.run,
            currentNodeId: "floor_30",
            progress: { ...state.run.progress, currentFloor: 30 },
          }
        : state.run,
    };
    state = controller.enterNode(state, state.run?.currentNodeId ?? "");
    state = defeatEnemyWithTetrises(controller, state);

    expect(state.scene).toBe("runResult");
    expect(state.runResult?.result).toBe("victory");
    expect(state.run?.relicInventory.relics.length).toBeGreaterThanOrEqual(1);
  });

  it("enters a shop floor and leaves to the next floor", () => {
    const controller = new GameFlowController(new SeededRandomProvider(21), new MemoryRepository());
    let state = controller.startRun();
    state = {
      ...state,
      run: state.run
        ? {
            ...state.run,
            currentNodeId: "floor_4",
            progress: { ...state.run.progress, currentFloor: 4 },
          }
        : state.run,
    };

    state = controller.enterNode(state, state.run?.currentNodeId ?? "");

    expect(state.scene).toBe("shop");
    expect(state.reward?.choices).toHaveLength(3);

    state = controller.completeCurrentNode(state);

    expect(state.scene).toBe("nodeMap");
    expect(state.run?.progress.currentFloor).toBe(5);
  });
});

function defeatEnemyWithTetrises(controller: GameFlowController, state: GameAppState): GameAppState {
  let next = state;
  for (let index = 0; index < 8 && next.scene === "combat"; index += 1) {
    next = controller.debugLineClear(next, 4);
  }
  return next;
}
