import type { GameAppState } from "./GameAppState";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { LockSystem } from "../domain/tetris/LockSystem";
import { PieceQueue } from "../domain/tetris/PieceQueue";
import { standardRuleSet, type TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";
import { createEnteredSpawnPiece, hasHiddenBlocks } from "../domain/tetris/SpawnRules";
import { ResolveLineClearUseCase } from "./ResolveLineClearUseCase";
import type { InitialActionState } from "./input/InitialActionState";
import { InitialActionApplier } from "./InitialActionApplier";
import { consumeInputsByCommand } from "./input/InputBuffer";
import { triggerCombatGameOver } from "./CombatGameOver";
import type { PlayerCombatState } from "../domain/combat/CombatState";
import type { GameEvent } from "../domain/shared/GameEvent";

export class LockActivePieceUseCase {
  constructor(
    private readonly random: RandomProvider,
    private readonly ruleSet: TetrisRuleSet = standardRuleSet,
  ) {}

  execute(state: GameAppState, piece = state.combat?.player.activePiece, initialAction?: InitialActionState, nowMs = 0): GameAppState {
    if (!state.combat || state.combat.result !== "ongoing") return state;
    if (!piece) {
      return triggerCombatGameOver(state, "missingActivePiece", ["activePiece missing during active combat"]);
    }
    if (hasHiddenBlocks(piece)) {
      return triggerCombatGameOver(state, "lockOut", ["lock-out detected"], piece);
    }
    const player = state.combat.player;
    const locked = new LockSystem().lock(player.board, piece, player.lastSpinAction);
    const queue = new PieceQueue(this.random, player.pieceQueue);
    const nextPieceType = queue.popNext();
    queue.ensureQueueSize(this.ruleSet.nextPreviewCount + 1);
    const nextPiece = createEnteredSpawnPiece(nextPieceType, locked.board, this.ruleSet);
    const nextHoldSlot = player.holdSlot.resetTurn(this.ruleSet.maxHoldSlots);
    const initial = new InitialActionApplier(this.random, this.ruleSet).apply({
      board: locked.board,
      activePiece: nextPiece,
      holdSlot: nextHoldSlot,
      pieceQueue: queue.snapshot(),
      initialAction,
    });
    const canSpawn = locked.board.canPlace(initial.activePiece);
    const fastChain = updateFastChain(player, nowMs, this.ruleSet.fastChainWindowMs, this.ruleSet.fastStateThreshold);
    const placementEvents: GameEvent[] = [{ type: "PiecePlaced" as const, pieceType: piece.type }, ...fastChain.events, { type: "PieceSpawned" as const, pieceType: nextPieceType }];
    const afterLock: GameAppState = {
      ...state,
      inputBuffer: state.inputBuffer ? consumeInputsByCommand(state.inputBuffer, initial.consumedInputs) : state.inputBuffer,
      combat: {
        ...state.combat,
        player: {
          ...player,
          ...fastChain.state,
          board: locked.board,
          activePiece: initial.activePiece,
          pieceQueue: initial.pieceQueue,
          nextPieces: initial.nextPieces,
          holdSlot: initial.holdSlot,
          hold: initial.hold,
          holdSlots: initial.holdSlot.holdSlots,
          maxHoldSlots: initial.holdSlot.maxHoldSlots,
          hasHeldThisPiece: initial.holdSlot.hasHeldThisPiece,
          holdUsedThisBattle: player.holdUsedThisBattle || initial.holdUsed,
          gravityElapsedMs: 0,
          lockElapsedMs: 0,
          softDropActive: false,
          isGrounded: false,
          groundedSinceMs: undefined,
          lockResetCount: 0,
          lastLockResetAtMs: undefined,
          lockResetLimitReachedLogged: false,
          lastSpinAction: initial.lastSpinAction,
        },
        result: state.combat.result,
        log: [...state.combat.log, ...placementEvents],
      },
      events: [...state.events, ...placementEvents],
    };

    if (!canSpawn) {
      return triggerCombatGameOver(afterLock, "spawnCollision", [
        "spawn failed",
        "cannot place spawned piece",
        "gameOver triggered by spawn collision",
      ], initial.activePiece);
    }

    return new ResolveLineClearUseCase(this.random, {
      keepBackToBackOnEmptyTSpin: this.ruleSet.keepBackToBackOnEmptyTSpin,
    }).execute(afterLock, locked.linesCleared, locked.spinResult, locked.clearResult.isPerfectClear, locked.clearResult);
  }
}

function updateFastChain(
  player: PlayerCombatState,
  nowMs: number,
  fastChainWindowMs: number,
  fastStateThreshold: number,
): { state: Pick<PlayerCombatState, "fastChainCount" | "isFastState" | "lastPieceLockTimeMs">; events: GameEvent[] } {
  const previousFastState = player.isFastState;
  const previousLockTime = player.lastPieceLockTimeMs;
  const withinWindow = previousLockTime !== undefined && nowMs - previousLockTime <= fastChainWindowMs;
  const fastChainCount = withinWindow ? player.fastChainCount + 1 : 1;
  const isFastState = fastChainCount >= fastStateThreshold;
  return {
    state: {
      fastChainCount,
      isFastState,
      lastPieceLockTimeMs: nowMs,
    },
    events: previousFastState !== isFastState ? [{ type: "FastStateChanged", active: isFastState, fastChainCount }] : [],
  };
}
