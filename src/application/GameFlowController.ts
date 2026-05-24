import type { GameAppState, PlayerInput } from "./GameAppState";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import type { SaveRunRepository } from "./ports/SaveRunRepository";
import { HandlePlayerInputUseCase } from "./HandlePlayerInputUseCase";
import { LoadRunUseCase } from "./LoadRunUseCase";
import { MoveToNextNodeUseCase } from "./MoveToNextNodeUseCase";
import { ResolveLineClearUseCase } from "./ResolveLineClearUseCase";
import { SaveRunUseCase } from "./SaveRunUseCase";
import { SelectRewardUseCase } from "./SelectRewardUseCase";
import { StartCombatUseCase } from "./StartCombatUseCase";
import { StartRunUseCase } from "./StartRunUseCase";
import { findNode } from "../domain/run/NodeMap";
import { TickCombatUseCase } from "./TickCombatUseCase";
import { canBufferInput, ProcessBufferedInputUseCase } from "./ProcessBufferedInputUseCase";
import { createInputBuffer, enqueueInput } from "./input/InputBuffer";
import type { InitialActionState } from "./input/InitialActionState";

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

  startRun(): GameAppState {
    const state = new StartRunUseCase().execute();
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
    const moved = new MoveToNextNodeUseCase().execute(state, nodeId);
    const node = moved.run ? findNode(moved.run.nodeMap, moved.run.currentNodeId) : undefined;
    const shouldStartCombat = node?.type === "combat" || node?.type === "elite" || node?.type === "boss";
    const next = shouldStartCombat ? new StartCombatUseCase(this.random).execute(moved) : moved;
    this.save(next);
    return next;
  }

  handleInput(state: GameAppState, input: PlayerInput, nowMs = 0, bufferable = true, initialAction?: InitialActionState): GameAppState {
    const result = new HandlePlayerInputUseCase(this.random).executeWithResult(state, input, nowMs, initialAction);
    const next =
      result.executed || !bufferable || !canBufferInput(state, input)
        ? result.state
        : { ...state, inputBuffer: enqueueInput(state.inputBuffer ?? createInputBuffer(), input, nowMs) };
    this.save(next);
    return next;
  }

  tickCombat(state: GameAppState, deltaMs: number, softDropPressed: boolean, nowMs = 0, initialAction?: InitialActionState): GameAppState {
    const ticked = new TickCombatUseCase(this.random).execute(state, deltaMs, softDropPressed, nowMs, initialAction);
    const next = new ProcessBufferedInputUseCase(this.random).execute(ticked, nowMs, initialAction);
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
