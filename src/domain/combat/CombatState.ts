import type { Board } from "../tetris/Board";
import type { ActivePiece } from "../tetris/ActivePiece";
import type { TetrominoType } from "../tetris/Cell";
import type { HoldSlot } from "../tetris/HoldSlot";
import type { CombatResult } from "./CombatResult";
import type { RelicInventory } from "../relic/RelicInventory";
import type { EnemyDefinition } from "../enemy/EnemyDefinition";
import type { EnemyIntent } from "../enemy/EnemyIntent";
import type { GameEvent } from "../shared/GameEvent";
import type { LastSpinAction, SpinResult } from "../tetris/SpinDetector";
import type { GarbageQueue } from "./GarbageQueue";

export type PlayerCombatState = {
  hp: number;
  board: Board;
  activePiece?: ActivePiece;
  pieceQueue: TetrominoType[];
  nextPieces: TetrominoType[];
  holdSlot: HoldSlot;
  hold?: TetrominoType;
  relicInventory: RelicInventory;
  combo: number;
  backToBackActive: boolean;
  actionCount: number;
  gravityElapsedMs: number;
  lockElapsedMs: number;
  softDropActive: boolean;
  isGrounded: boolean;
  groundedSinceMs?: number;
  lockResetCount: number;
  lastLockResetAtMs?: number;
  lockResetLimitReachedLogged: boolean;
  lastSpinAction?: LastSpinAction;
};

export type EnemyCombatState = {
  definition: EnemyDefinition;
  hp: number;
  currentIntent?: EnemyIntent;
  pendingGarbage: number;
  garbageQueue: GarbageQueue;
};

export type CombatState = {
  player: PlayerCombatState;
  enemy: EnemyCombatState;
  result: CombatResult;
  lastAttack?: number;
  lastBaseAttack?: number;
  lastLinesCleared?: number;
  lastSpinResult?: SpinResult;
  log: GameEvent[];
};
