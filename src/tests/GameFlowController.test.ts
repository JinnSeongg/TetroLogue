import { describe, expect, it } from "vitest";
import { GameFlowController } from "../application/GameFlowController";
import type { GameAppState } from "../application/GameAppState";
import type { SaveRunRepository } from "../application/ports/SaveRunRepository";
import { relicRewardTable, shopRelicRewardTable } from "../data/rewardTables";
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

  it("skips combat reward when every combat reward relic is already maxed", () => {
    const controller = new GameFlowController(new SeededRandomProvider(22), new MemoryRepository());
    let state = withOwnedRewards(controller.startRun(), relicRewardTable);

    state = controller.enterNode(state, state.run?.currentNodeId ?? "");
    state = defeatEnemyWithTetrises(controller, state);

    expect(state.scene).toBe("nodeMap");
    expect(state.reward).toBeUndefined();
    expect(state.run?.progress.currentFloor).toBe(2);
  });

  it("skips event reward when every combat reward relic is already maxed", () => {
    const controller = new GameFlowController(new SeededRandomProvider(23), new MemoryRepository());
    let state = withOwnedRewards(controller.startRun(), relicRewardTable);
    state = {
      ...state,
      run: state.run
        ? {
            ...state.run,
            progress: {
              ...state.run.progress,
              nodes: state.run.progress.nodes.map((node) => (node.floor === 1 ? { floor: 1, type: "event" as const, rewardTableId: "default_relic" } : node)),
            },
          }
        : state.run,
    };

    state = controller.enterNode(state, state.run?.currentNodeId ?? "");

    expect(state.scene).toBe("nodeMap");
    expect(state.reward).toBeUndefined();
    expect(state.run?.progress.currentFloor).toBe(2);
  });

  it("allows leaving a shop when every shop relic is already maxed", () => {
    const controller = new GameFlowController(new SeededRandomProvider(24), new MemoryRepository());
    let state = withOwnedRewards(controller.startRun(), shopRelicRewardTable);
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
    expect(state.reward?.choices).toEqual([]);

    state = controller.completeCurrentNode(state);

    expect(state.scene).toBe("nodeMap");
    expect(state.run?.progress.currentFloor).toBe(5);
  });
});

function defeatEnemyWithTetrises(controller: GameFlowController, state: GameAppState): GameAppState {
  const weakened = state.combat
    ? { ...state, combat: { ...state.combat, enemy: { ...state.combat.enemy, hp: 1 } } }
    : state;
  return controller.debugLineClear(weakened, 4);
}

function withOwnedRewards(state: GameAppState, rewards: typeof relicRewardTable): GameAppState {
  if (!state.run) return state;
  const relicInventory = rewards.reduce((inventory, reward) => inventory.add(String(reward.relicId)), state.run.relicInventory);
  return { ...state, run: { ...state.run, relicInventory } };
}
