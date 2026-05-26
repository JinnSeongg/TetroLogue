import type { GameAppState, PlayerInput } from "./GameAppState";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import type { SaveRunRepository } from "./ports/SaveRunRepository";
import { HandlePlayerInputUseCase } from "./HandlePlayerInputUseCase";
import { LoadRunUseCase } from "./LoadRunUseCase";
import { ResolveLineClearUseCase } from "./ResolveLineClearUseCase";
import { SaveRunUseCase } from "./SaveRunUseCase";
import { SelectRewardUseCase } from "./SelectRewardUseCase";
import { StartCombatUseCase } from "./StartCombatUseCase";
import { StartRunUseCase } from "./StartRunUseCase";
import { TickCombatUseCase } from "./TickCombatUseCase";
import { canBufferInput, ProcessBufferedInputUseCase } from "./ProcessBufferedInputUseCase";
import { createInputBuffer, enqueueInput } from "./input/InputBuffer";
import type { InitialActionState } from "./input/InitialActionState";
import { standardRuleSet, type TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";
import { getCurrentNode } from "../domain/run/RunProgression";
import { RewardGenerator } from "../domain/reward/RewardGenerator";
import { relicRewardTable, shopRelicRewardTable } from "../data/rewardTables";
import { CompleteCurrentNodeUseCase } from "./CompleteCurrentNodeUseCase";
import type { DifficultyId } from "../domain/balance/balanceTypes";

export class GameFlowController {
  constructor(
    private readonly random: RandomProvider,
    private readonly repository: SaveRunRepository,
  ) {}

  createInitialState(): GameAppState {
    return {
      scene: "mainMenu",
      canContinue: new LoadRunUseCase(this.repository).execute() !== undefined,
      events: [],
    };
  }

  showDifficultySelect(): GameAppState {
    return {
      scene: "difficultySelect",
      canContinue: new LoadRunUseCase(this.repository).execute() !== undefined,
      events: [],
    };
  }

  startRun(difficultyId: DifficultyId = "standard"): GameAppState {
    const state = new StartRunUseCase(this.random).execute(difficultyId);
    this.save(state);
    return state;
  }

  continueRun(): GameAppState {
    return new LoadRunUseCase(this.repository).execute() ?? this.createInitialState();
  }

  returnToMenu(): GameAppState {
    return this.createInitialState();
  }

  enterNode(state: GameAppState, nodeId: string): GameAppState {
    if (!state.run || nodeId !== state.run.currentNodeId) return state;
    const node = getCurrentNode(state.run.progress);
    if (!node) return state;
    const entered: GameAppState = {
      ...state,
      reward: undefined,
      combat: undefined,
      runResult: undefined,
      events: [...state.events, { type: "NodeEntered", nodeId }],
    };
    const next =
      node.type === "battle" || node.type === "boss" || node.type === "finalBoss"
        ? new StartCombatUseCase(this.random).execute({
            ...entered,
            run: { ...state.run, status: "combat" },
          })
        : node.type === "event"
        ? {
            ...entered,
            scene: "reward" as const,
            run: { ...state.run, status: "event" as const },
            reward: { choices: new RewardGenerator(relicRewardTable, this.random).generate(3, state.run.relicInventory) },
          }
        : {
            ...entered,
            scene: "shop" as const,
            run: { ...state.run, status: "shop" as const },
            reward: { choices: new RewardGenerator(shopRelicRewardTable, this.random).generate(3, state.run.relicInventory) },
          };
    this.save(next);
    return next;
  }

  completeCurrentNode(state: GameAppState): GameAppState {
    const next = new CompleteCurrentNodeUseCase().execute(state);
    this.save(next);
    return next;
  }

  handleInput(state: GameAppState, input: PlayerInput, nowMs = 0, bufferable = true, initialAction?: InitialActionState): GameAppState {
    const ruleSet = state.combat?.ruleSet ?? standardRuleSet;
    const result = new HandlePlayerInputUseCase(this.random, ruleSet).executeWithResult(state, input, nowMs, initialAction);
    const next =
      result.executed || !bufferable || !canBufferInput(state, input, ruleSet)
        ? result.state
        : { ...state, inputBuffer: enqueueInput(state.inputBuffer ?? createInputBuffer(), input, nowMs) };
    this.save(next);
    return next;
  }

  tickCombat(
    state: GameAppState,
    deltaMs: number,
    softDropSteps: number,
    nowMs = 0,
    initialAction?: InitialActionState,
    ruleSet?: TetrisRuleSet,
  ): GameAppState {
    const currentRuleSet = ruleSet ?? state.combat?.ruleSet ?? standardRuleSet;
    const ticked = new TickCombatUseCase(this.random, currentRuleSet).execute(state, deltaMs, softDropSteps, nowMs, initialAction);
    const next = new ProcessBufferedInputUseCase(this.random, currentRuleSet).execute(ticked, nowMs, initialAction);
    if (next !== state) this.save(next);
    return next;
  }

  debugLineClear(state: GameAppState, lines: number): GameAppState {
    const next = new ResolveLineClearUseCase(this.random).execute(state, lines);
    this.save(next);
    return next;
  }

  selectReward(state: GameAppState, rewardId: string): GameAppState {
    const next = new SelectRewardUseCase().execute(state, rewardId);
    this.save(next);
    return next;
  }

  private save(state: GameAppState): void {
    if (state.scene !== "mainMenu") new SaveRunUseCase(this.repository).execute(state);
  }
}
