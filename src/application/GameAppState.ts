import type { CombatState } from "../domain/combat/CombatState";
import type { RewardState } from "../domain/reward/RewardState";
import type { RunState } from "../domain/run/RunState";
import type { GameEvent } from "../domain/shared/GameEvent";
import type { InputBuffer } from "./input/InputBuffer";

export type SceneState = "mainMenu" | "difficultySelect" | "nodeMap" | "combat" | "reward" | "shop" | "runResult";

export type RunResultState = {
  result: "victory" | "defeat";
  title: string;
  message: string;
};

export type GameAppState = {
  scene: SceneState;
  run?: RunState;
  combat?: CombatState;
  reward?: RewardState;
  runResult?: RunResultState;
  canContinue?: boolean;
  inputBuffer?: InputBuffer;
  events: GameEvent[];
};

export type PlayerInput = "moveLeft" | "moveRight" | "rotateClockwise" | "rotateCounterClockwise" | "rotate180" | "hardDrop" | "hold";
