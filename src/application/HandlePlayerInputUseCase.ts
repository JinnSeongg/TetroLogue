import type { GameAppState, PlayerInput } from "./GameAppState";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { PieceQueue } from "../domain/tetris/PieceQueue";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import type { TetrominoType } from "../domain/tetris/Cell";
import { MovementSystem } from "../domain/tetris/MovementSystem";
import { RotationSystem } from "../domain/tetris/RotationSystem";
import { standardRuleSet, type TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";
import { LockActivePieceUseCase } from "./LockActivePieceUseCase";
import type { PlayerCombatState } from "../domain/combat/CombatState";
import type { ActivePiece as ActivePieceType } from "../domain/tetris/ActivePiece";
import { GhostPieceCalculator } from "../domain/tetris/GhostPieceCalculator";
import type { LastSpinAction } from "../domain/tetris/SpinDetector";
import type { LastRotation } from "../domain/tetris/rotation/RotationAttemptResult";
import type { InitialActionState } from "./input/InitialActionState";

export type PlayerInputExecutionResult = {
  state: GameAppState;
  executed: boolean;
};

export class HandlePlayerInputUseCase {
  constructor(
    private readonly random: RandomProvider,
    private readonly ruleSet: TetrisRuleSet = standardRuleSet,
  ) {}

  execute(state: GameAppState, input: PlayerInput, nowMs = 0, initialAction?: InitialActionState): GameAppState {
    return this.executeWithResult(state, input, nowMs, initialAction).state;
  }

  executeWithResult(state: GameAppState, input: PlayerInput, nowMs = 0, initialAction?: InitialActionState): PlayerInputExecutionResult {
    const activePiece = state.combat?.player.activePiece;
    if (!state.combat || !activePiece || state.combat.result !== "ongoing") return { state, executed: false };
    const player = state.combat.player;
    const movement = new MovementSystem();
    const rotation = new RotationSystem();
    let piece = activePiece;

    if (input === "moveLeft") piece = movement.tryMove(player.board, piece, -1, 0);
    if (input === "moveRight") piece = movement.tryMove(player.board, piece, 1, 0);
    if (input === "rotateClockwise") piece = rotation.tryRotateClockwise(player.board, piece);
    if (input === "rotateCounterClockwise") piece = rotation.tryRotateCounterClockwise(player.board, piece);
    if (input === "rotate180") piece = rotation.tryRotate180(player.board, piece);
    if (input === "hold") {
      if (!this.ruleSet.holdEnabled) return { state, executed: false };
      const holdResult = player.holdSlot.hold(activePiece.type);
      if (holdResult.slot === player.holdSlot) return { state, executed: false };

      const queue = new PieceQueue(this.random, player.pieceQueue);
      const nextPieceType: TetrominoType = holdResult.swapped ?? queue.popNext();
      queue.ensureQueueSize(this.ruleSet.nextPreviewCount + 1);
      const nextPiece = new ActivePiece(nextPieceType, { x: Math.floor(this.ruleSet.boardWidth / 2), y: 0 });
      const canPlaceNextPiece = player.board.canPlace(nextPiece);
      return {
        state: {
          ...state,
          scene: canPlaceNextPiece ? state.scene : "runResult",
          runResult: canPlaceNextPiece ? state.runResult : { result: "defeat", title: "Run Failed", message: "The stack reached the top." },
          combat: {
            ...state.combat,
            player: {
              ...player,
              activePiece: canPlaceNextPiece ? nextPiece : undefined,
              pieceQueue: holdResult.swapped ? player.pieceQueue : queue.snapshot(),
              nextPieces: holdResult.swapped ? player.nextPieces : queue.peekNext(this.ruleSet.nextPreviewCount),
              hold: holdResult.slot.held,
              holdSlot: holdResult.slot,
              isGrounded: false,
              groundedSinceMs: undefined,
              lockElapsedMs: 0,
              lockResetCount: 0,
              lastLockResetAtMs: undefined,
              lockResetLimitReachedLogged: false,
              lastSpinAction: undefined,
            },
            result: canPlaceNextPiece ? state.combat.result : "defeat",
            log: [...state.combat.log, { type: "PieceSpawned", pieceType: nextPieceType }],
          },
          events: [...state.events, { type: "PieceSpawned", pieceType: nextPieceType }],
        },
        executed: true,
      };
    }

    if (input !== "hardDrop") {
      const changed =
        piece.position.x !== activePiece.position.x ||
        piece.position.y !== activePiece.position.y ||
        piece.rotation !== activePiece.rotation;
      if (!changed) return { state, executed: false };
      const lockReset = applyLockReset(player, activePiece, piece, input, this.ruleSet.maxLockResets, nowMs);
      const lastSpinAction = spinActionAfterInput(player, piece, input);
      return {
        state: {
          ...state,
          combat: {
            ...state.combat,
            player: { ...lockReset.player, activePiece: piece, lastSpinAction },
            log: lockReset.event ? [...state.combat.log, lockReset.event] : state.combat.log,
          },
          events: lockReset.event ? [...state.events, lockReset.event] : state.events,
        },
        executed: true,
      };
    }

    const dropPiece = new GhostPieceCalculator().calculate(player.board, piece) ?? piece;
    return { state: new LockActivePieceUseCase(this.random, this.ruleSet).execute(state, dropPiece, initialAction), executed: true };
  }
}

const lockResetInputs: PlayerInput[] = ["moveLeft", "moveRight", "rotateClockwise", "rotateCounterClockwise", "rotate180"];

function applyLockReset(
  player: PlayerCombatState,
  fromPiece: ActivePieceType,
  toPiece: ActivePieceType,
  input: PlayerInput,
  maxLockResets: number,
  nowMs: number,
): { player: PlayerCombatState; event?: { type: "LockResetLimitReached"; count: number } } {
  const fromGrounded = !player.board.canPlace(fromPiece.move(0, 1));
  const toGrounded = !player.board.canPlace(toPiece.move(0, 1));
  if (!lockResetInputs.includes(input)) {
    return { player };
  }

  if (!toGrounded) {
    return {
      player: {
        ...player,
        isGrounded: false,
        groundedSinceMs: undefined,
        lockElapsedMs: 0,
      },
    };
  }

  if (!fromGrounded) {
    return { player: { ...player, isGrounded: true, groundedSinceMs: player.groundedSinceMs ?? nowMs } };
  }

  if (player.lockResetCount < maxLockResets) {
    return {
      player: {
        ...player,
        isGrounded: true,
        groundedSinceMs: nowMs,
        lockElapsedMs: 0,
        lockResetCount: player.lockResetCount + 1,
        lastLockResetAtMs: nowMs,
        lockResetLimitReachedLogged: false,
      },
    };
  }

  const shouldLogLimit = !player.lockResetLimitReachedLogged;
  return {
    player: {
      ...player,
      isGrounded: true,
      groundedSinceMs: player.groundedSinceMs ?? nowMs,
      lockResetLimitReachedLogged: true,
    },
    event: shouldLogLimit ? { type: "LockResetLimitReached", count: player.lockResetCount } : undefined,
  };
}

function spinActionAfterInput(player: PlayerCombatState, piece: ActivePieceType, input: PlayerInput): PlayerCombatState["lastSpinAction"] {
  if (input === "rotateClockwise" || input === "rotateCounterClockwise" || input === "rotate180") {
    return isSuccessfulRotation(piece.lastRotation) ? piece.lastRotation : player.lastSpinAction;
  }
  if (input === "moveLeft" || input === "moveRight" || input === "hold") return undefined;
  return player.lastSpinAction;
}

function isSuccessfulRotation(lastRotation: LastRotation | undefined): lastRotation is LastSpinAction {
  return lastRotation?.success === true;
}
