import type { GameAppState } from "./GameAppState";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { Board } from "../domain/tetris/Board";
import { PieceQueue } from "../domain/tetris/PieceQueue";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import { HoldSlot } from "../domain/tetris/HoldSlot";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";
import { findNode } from "../domain/run/NodeMap";
import { enemyDefinitions } from "../data/enemyDefinitions";
import type { TetrominoType } from "../domain/tetris/Cell";
import { createInputBuffer } from "./input/InputBuffer";
import { garbageConfig } from "../domain/combat/GarbageConfig";
import { GarbageQueue } from "../domain/combat/GarbageQueue";

export class StartCombatUseCase {
  constructor(private readonly random: RandomProvider) {}

  execute(state: GameAppState): GameAppState {
    if (!state.run) return state;
    const node = findNode(state.run.nodeMap, state.run.currentNodeId);
    const enemy = enemyDefinitions[node?.enemyId ?? "enemy_dummy"];
    const queue = new PieceQueue(this.random);
    const firstPiece: TetrominoType = queue.popNext();
    const activePiece = new ActivePiece(firstPiece, { x: Math.floor(standardRuleSet.boardWidth / 2), y: 0 });
    const board = Board.create(standardRuleSet.boardWidth, standardRuleSet.boardHeight);
    queue.ensureQueueSize(standardRuleSet.nextPreviewCount + 1);
    return {
      ...state,
      scene: "combat",
      reward: undefined,
      runResult: undefined,
      inputBuffer: createInputBuffer(),
      combat: {
        player: {
          hp: 1,
          board,
          activePiece,
          pieceQueue: queue.snapshot(),
          nextPieces: queue.peekNext(standardRuleSet.nextPreviewCount),
          holdSlot: new HoldSlot(),
          relicInventory: state.run.relicInventory,
          combo: 0,
          backToBackActive: false,
          actionCount: 0,
          gravityElapsedMs: 0,
          lockElapsedMs: 0,
          softDropActive: false,
          isGrounded: false,
          groundedSinceMs: undefined,
          lockResetCount: 0,
          lastLockResetAtMs: undefined,
          lockResetLimitReachedLogged: false,
          lastSpinAction: undefined,
        },
        enemy: {
          definition: enemy,
          hp: enemy.maxHp,
          pendingGarbage: 0,
          garbageQueue: new GarbageQueue({ defaultDelay: garbageConfig.defaultIncomingGarbageDelay }),
        },
        result: "ongoing",
        log: [{ type: "CombatStarted", enemyId: enemy.id }, { type: "PieceSpawned", pieceType: firstPiece }],
      },
      events: [...state.events, { type: "CombatStarted", enemyId: enemy.id }, { type: "PieceSpawned", pieceType: firstPiece }],
    };
  }
}
