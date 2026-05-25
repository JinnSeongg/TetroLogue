import type { GameAppState } from "./GameAppState";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import { LockSystem } from "../domain/tetris/LockSystem";
import { PieceQueue } from "../domain/tetris/PieceQueue";
import { standardRuleSet, type TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";
import { ResolveLineClearUseCase } from "./ResolveLineClearUseCase";
import type { InitialActionState } from "./input/InitialActionState";
import { InitialActionApplier } from "./InitialActionApplier";
import { consumeInputsByCommand } from "./input/InputBuffer";

export class LockActivePieceUseCase {
  constructor(
    private readonly random: RandomProvider,
    private readonly ruleSet: TetrisRuleSet = standardRuleSet,
  ) {}

  execute(state: GameAppState, piece = state.combat?.player.activePiece, initialAction?: InitialActionState): GameAppState {
    if (!state.combat || !piece || state.combat.result !== "ongoing") return state;
    const player = state.combat.player;
    const locked = new LockSystem().lock(player.board, piece, player.lastSpinAction);
    const queue = new PieceQueue(this.random, player.pieceQueue);
    const nextPieceType = queue.popNext();
    queue.ensureQueueSize(this.ruleSet.nextPreviewCount + 1);
    const nextPiece = new ActivePiece(nextPieceType, { x: Math.floor(this.ruleSet.boardWidth / 2), y: 0 });
    const nextHoldSlot = player.holdSlot.resetTurn();
    const initial = new InitialActionApplier(this.random, this.ruleSet).apply({
      board: locked.board,
      activePiece: nextPiece,
      holdSlot: nextHoldSlot,
      pieceQueue: queue.snapshot(),
      initialAction,
    });
    const canSpawn = locked.board.canPlace(initial.activePiece);
    const placementEvents = [{ type: "PiecePlaced" as const, pieceType: piece.type }, { type: "PieceSpawned" as const, pieceType: nextPieceType }];
    const afterLock: GameAppState = {
      ...state,
      inputBuffer: state.inputBuffer ? consumeInputsByCommand(state.inputBuffer, initial.consumedInputs) : state.inputBuffer,
      combat: {
        ...state.combat,
        player: {
          ...player,
          board: locked.board,
          activePiece: canSpawn ? initial.activePiece : undefined,
          pieceQueue: initial.pieceQueue,
          nextPieces: initial.nextPieces,
          holdSlot: initial.holdSlot,
          hold: initial.hold,
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
        result: canSpawn ? state.combat.result : "defeat",
        log: [...state.combat.log, ...placementEvents],
      },
      events: [...state.events, ...placementEvents],
    };

    if (!canSpawn) {
      const combatEnded = { type: "CombatEnded" as const, result: "defeat" as const };
      return {
        ...afterLock,
        scene: "runResult",
        runResult: { result: "defeat", title: "Run Failed", message: "Board overflow: the stack reached the top." },
        combat: { ...afterLock.combat!, log: [...afterLock.combat!.log, combatEnded] },
        events: [...afterLock.events, combatEnded],
      };
    }

    return new ResolveLineClearUseCase(this.random, {
      keepBackToBackOnEmptyTSpin: this.ruleSet.keepBackToBackOnEmptyTSpin,
    }).execute(afterLock, locked.linesCleared, locked.spinResult, locked.clearResult.isPerfectClear, locked.clearResult);
  }
}
