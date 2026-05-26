import type { GameAppState, PlayerInput } from "./GameAppState";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { PieceQueue } from "../domain/tetris/PieceQueue";
import type { TetrominoType } from "../domain/tetris/Cell";
import { MovementSystem } from "../domain/tetris/MovementSystem";
import { RotationSystem } from "../domain/tetris/RotationSystem";
import { standardRuleSet, type TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";
import { LockActivePieceUseCase } from "./LockActivePieceUseCase";
import type { PlayerCombatState } from "../domain/combat/CombatState";
import type { ActivePiece as ActivePieceType } from "../domain/tetris/ActivePiece";
import { GhostPieceCalculator } from "../domain/tetris/GhostPieceCalculator";
import { createEnteredSpawnPiece } from "../domain/tetris/SpawnRules";
import type { LastSpinAction } from "../domain/tetris/SpinDetector";
import type { LastRotation } from "../domain/tetris/rotation/RotationAttemptResult";
import type { InitialActionState } from "./input/InitialActionState";
import { triggerCombatGameOver } from "./CombatGameOver";
import type { GameEvent } from "../domain/shared/GameEvent";

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
    if (!state.combat || state.combat.result !== "ongoing") return { state, executed: false };
    if (!activePiece) {
      return { state: triggerCombatGameOver(state, "missingActivePiece", ["activePiece missing during active combat"]), executed: false };
    }
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
      const currentHoldSlot = player.holdSlot.withMaxSlots(this.ruleSet.maxHoldSlots);
      const holdResult = currentHoldSlot.hold(activePiece.type);
      if (holdResult.slot === currentHoldSlot) return { state, executed: false };

      const queue = new PieceQueue(this.random, player.pieceQueue);
      const nextPieceType: TetrominoType = holdResult.swapped ?? queue.popNext();
      queue.ensureQueueSize(this.ruleSet.nextPreviewCount + 1);
      const nextPiece = createEnteredSpawnPiece(nextPieceType, player.board, this.ruleSet);
      const canPlaceNextPiece = player.board.canPlace(nextPiece);
      const nextState: GameAppState = {
        ...state,
        combat: {
          ...state.combat,
          player: {
            ...player,
            activePiece: nextPiece,
            pieceQueue: holdResult.swapped ? player.pieceQueue : queue.snapshot(),
            nextPieces: holdResult.swapped ? player.nextPieces : queue.peekNext(this.ruleSet.nextPreviewCount),
            hold: holdResult.slot.held,
            holdSlot: holdResult.slot,
            holdSlots: holdResult.slot.holdSlots,
            maxHoldSlots: holdResult.slot.maxHoldSlots,
            hasHeldThisPiece: holdResult.slot.hasHeldThisPiece,
            holdUsedThisBattle: true,
            isGrounded: false,
            groundedSinceMs: undefined,
            lockElapsedMs: 0,
            lockResetCount: 0,
            lastLockResetAtMs: undefined,
            lockResetLimitReachedLogged: false,
            lastSpinAction: undefined,
          },
          log: [...state.combat.log, { type: "PieceSpawned" as const, pieceType: nextPieceType }],
        },
        events: [...state.events, { type: "PieceSpawned" as const, pieceType: nextPieceType }],
      };
      return {
        state: canPlaceNextPiece
          ? nextState
          : triggerCombatGameOver(nextState, "spawnCollision", [
              "spawn failed",
              "cannot place spawned piece",
              "gameOver triggered by spawn collision",
            ], nextPiece),
        executed: true,
      };
    }

    if (input !== "hardDrop") {
      const changed = activePieceChanged(activePiece, piece);
      if (!changed) return { state, executed: false };
      const lockReset = applyLockReset(player, activePiece, piece, input, this.ruleSet.maxLockResets, nowMs);
      const lastSpinAction = spinActionAfterInput(player, piece, input);
      const actionSoundEvent = actionSoundEventAfterInput(input);
      const events = [lockReset.event, actionSoundEvent].filter((event): event is GameEvent => event !== undefined);
      return {
        state: {
          ...state,
          combat: {
            ...state.combat,
            player: { ...lockReset.player, activePiece: piece, lastSpinAction },
            log: lockReset.event ? [...state.combat.log, lockReset.event] : state.combat.log,
          },
          events: events.length > 0 ? [...state.events, ...events] : state.events,
        },
        executed: true,
      };
    }

    const dropPiece = new GhostPieceCalculator().calculate(player.board, piece) ?? piece;
    return { state: new LockActivePieceUseCase(this.random, this.ruleSet).execute(state, dropPiece, initialAction, nowMs), executed: true };
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

function activePieceChanged(fromPiece: ActivePieceType, toPiece: ActivePieceType): boolean {
  if (fromPiece.position.x !== toPiece.position.x) return true;
  if (fromPiece.position.y !== toPiece.position.y) return true;
  if (fromPiece.rotation !== toPiece.rotation) return true;
  const fromBlocks = fromPiece.blocks();
  const toBlocks = toPiece.blocks();
  return fromBlocks.some((block, index) => block.x !== toBlocks[index]?.x || block.y !== toBlocks[index]?.y);
}

function actionSoundEventAfterInput(input: PlayerInput): GameEvent | undefined {
  if (input === "moveLeft" || input === "moveRight") return { type: "PlayerActionSucceeded", action: "move" };
  if (input === "rotateClockwise" || input === "rotateCounterClockwise" || input === "rotate180") {
    return { type: "PlayerActionSucceeded", action: "rotate" };
  }
  return undefined;
}
