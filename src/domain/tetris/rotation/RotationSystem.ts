import type { TetrominoType } from "../Cell";
import type { ActivePiece } from "../ActivePiece";
import type { Board } from "../Board";
import type { KickOffset } from "./KickOffset";
import { toBoardOffset } from "./KickOffset";
import type { KickTable, KickTableProvider } from "./KickTable";
import type { RotationAttemptResult, LastRotation } from "./RotationAttemptResult";
import type { RotationDirection } from "./RotationDirection";
import { getRotationTarget, toRotationTransition } from "./RotationTransition";
import { normalizeRotationState } from "./RotationState";
import { SrsKickTableProvider } from "./SrsKickTables";
import { Srs180KickTableProvider } from "./Srs180KickTables";
import type { RotationState } from "./RotationState";

export class RotationSystem {
  private static debugFailures = false;

  constructor(private readonly providers: KickTableProvider[] = [new SrsKickTableProvider(), new Srs180KickTableProvider()]) {}

  static setDebugFailures(enabled: boolean): void {
    RotationSystem.debugFailures = enabled;
  }

  tryRotateClockwise(board: Board, piece: ActivePiece): ActivePiece {
    return this.attempt(board, piece, "CW").piece;
  }

  tryRotateCounterClockwise(board: Board, piece: ActivePiece): ActivePiece {
    return this.attempt(board, piece, "CCW").piece;
  }

  tryRotate180(board: Board, piece: ActivePiece): ActivePiece {
    return this.attempt(board, piece, "ONE_EIGHTY").piece;
  }

  tryRotate(board: Board, piece: ActivePiece): ActivePiece {
    return this.tryRotateClockwise(board, piece);
  }

  attempt(board: Board, piece: ActivePiece, direction: RotationDirection): RotationAttemptResult {
    const from = normalizeRotationState(piece.rotation);
    const to = getRotationTarget(from, direction);
    const transition = toRotationTransition(from, to);
    const kickTable = this.getKickTable(piece.type, direction);
    const offsets = kickTable[transition] ?? [{ x: 0, y: 0 }];

    const standardAttempt = this.tryOffsets(board, piece, direction, from, to, offsets);
    if (standardAttempt) return { ...standardAttempt, transition };

    this.logFailureDebug(board, piece, direction, from, to, offsets);

    const failedRotation: LastRotation = { pieceType: piece.type, direction, from, to, success: false };
    return {
      success: false,
      piece: piece.withPosition(piece.position, failedRotation),
      direction,
      from,
      to,
      transition,
    };
  }

  private getKickTable(pieceType: TetrominoType, direction: RotationDirection): KickTable {
    return this.providers.reduce<KickTable>((table, provider) => ({ ...table, ...provider.getKickTable(pieceType, direction) }), {});
  }

  private tryOffsets(
    board: Board,
    piece: ActivePiece,
    direction: RotationDirection,
    from: RotationState,
    to: RotationState,
    offsets: KickOffset[],
  ): Omit<Extract<RotationAttemptResult, { success: true }>, "transition"> | undefined {
    for (const [usedKickIndex, originalOffset] of offsets.entries()) {
      const boardOffset = toBoardOffset(originalOffset);
      const rotated = piece.withRotation(to).move(boardOffset.x, boardOffset.y);
      if (board.canPlace(rotated)) {
        const lastRotation: LastRotation = {
          pieceType: piece.type,
          direction,
          from,
          to,
          usedKickIndex,
          usedKickOffset: originalOffset,
          success: true,
        };
        return {
          success: true,
          piece: rotated.withPosition(rotated.position, lastRotation),
          direction,
          from,
          to,
          usedKickIndex,
          usedKickOffset: originalOffset,
        };
      }
    }
    return undefined;
  }

  private logFailureDebug(
    board: Board,
    piece: ActivePiece,
    direction: RotationDirection,
    from: RotationState,
    to: RotationState,
    offsets: KickOffset[],
  ): void {
    if (!RotationSystem.debugFailures) return;
    const rotatedPiece = piece.withRotation(to);
    const attempts = offsets.map((originalOffset, kickIndex) => {
      const boardOffset = toBoardOffset(originalOffset);
      const candidate = rotatedPiece.move(boardOffset.x, boardOffset.y);
      return {
        kickIndex,
        offset: originalOffset,
        boardOffset,
        absoluteBlocks: candidate.blocks(),
        canPlace: board.canPlaceDetailed(candidate),
      };
    });
    console.debug("Rotation failure", {
      pieceType: piece.type,
      fromRotation: from,
      toRotation: to,
      direction,
      piecePosition: piece.position,
      beforeLocalBlocks: piece.localBlocks(),
      beforeAbsoluteBlocks: piece.blocks(),
      afterLocalBlocks: rotatedPiece.localBlocks(),
      afterAbsoluteBlocksBeforeKick: rotatedPiece.blocks(),
      attempts,
    });
  }
}
