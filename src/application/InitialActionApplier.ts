import type { PlayerInput } from "./GameAppState";
import type { InitialActionState } from "./input/InitialActionState";
import { initialRotationToPlayerInput } from "./input/InitialActionState";
import type { ActivePiece } from "../domain/tetris/ActivePiece";
import { createEnteredSpawnPiece } from "../domain/tetris/SpawnRules";
import type { Board } from "../domain/tetris/Board";
import type { HoldSlot } from "../domain/tetris/HoldSlot";
import { PieceQueue } from "../domain/tetris/PieceQueue";
import { RotationSystem } from "../domain/tetris/RotationSystem";
import type { TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";
import type { TetrominoType } from "../domain/tetris/Cell";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import type { LastSpinAction } from "../domain/tetris/SpinDetector";
import type { LastRotation } from "../domain/tetris/rotation/RotationAttemptResult";

export type InitialActionApplierInput = {
  board: Board;
  activePiece: ActivePiece;
  holdSlot: HoldSlot;
  pieceQueue: TetrominoType[];
  initialAction?: InitialActionState;
};

export type InitialActionApplierResult = {
  activePiece: ActivePiece;
  holdSlot: HoldSlot;
  hold?: TetrominoType;
  pieceQueue: TetrominoType[];
  nextPieces: TetrominoType[];
  lastSpinAction?: LastSpinAction;
  consumedInputs: PlayerInput[];
  holdUsed: boolean;
};

export class InitialActionApplier {
  constructor(
    private readonly random: RandomProvider,
    private readonly ruleSet: TetrisRuleSet,
  ) {}

  apply(input: InitialActionApplierInput): InitialActionApplierResult {
    let activePiece = input.activePiece;
    let holdSlot = input.holdSlot.withMaxSlots(this.ruleSet.maxHoldSlots);
    let lastSpinAction: LastSpinAction | undefined;
    const consumedInputs: PlayerInput[] = [];
    const queue = new PieceQueue(this.random, input.pieceQueue);
    let holdUsed = false;

    if (input.initialAction?.holdRequested && this.ruleSet.holdEnabled) {
      const holdResult = holdSlot.hold(activePiece.type);
      if (holdResult.slot !== holdSlot) {
        holdSlot = holdResult.slot;
        const nextPieceType = holdResult.swapped ?? queue.popNext();
        activePiece = createEnteredSpawnPiece(nextPieceType, input.board, this.ruleSet);
        lastSpinAction = undefined;
        consumedInputs.push("hold");
        holdUsed = true;
      }
    }

    const rotationInput = initialRotationToPlayerInput(input.initialAction?.rotationRequested ?? "None");
    if (rotationInput) {
      const rotated = this.rotate(input.board, activePiece, rotationInput);
      if (rotated !== activePiece && isSuccessfulRotation(rotated.lastRotation)) {
        activePiece = rotated;
        lastSpinAction = rotated.lastRotation;
        consumedInputs.push(rotationInput);
      }
    }

    queue.ensureQueueSize(this.ruleSet.nextPreviewCount + 1);
    return {
      activePiece,
      holdSlot,
      hold: holdSlot.held,
      pieceQueue: queue.snapshot(),
      nextPieces: queue.peekNext(this.ruleSet.nextPreviewCount),
      lastSpinAction,
      consumedInputs,
      holdUsed,
    };
  }

  private rotate(board: Board, piece: ActivePiece, input: PlayerInput): ActivePiece {
    const rotation = new RotationSystem();
    if (input === "rotateClockwise") return rotation.tryRotateClockwise(board, piece);
    if (input === "rotateCounterClockwise") return rotation.tryRotateCounterClockwise(board, piece);
    if (input === "rotate180") return rotation.tryRotate180(board, piece);
    return piece;
  }
}

function isSuccessfulRotation(lastRotation: LastRotation | undefined): lastRotation is LastSpinAction {
  return lastRotation?.success === true;
}
