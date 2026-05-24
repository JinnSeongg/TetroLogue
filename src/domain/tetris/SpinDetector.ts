import type { ActivePiece } from "./ActivePiece";
import type { Board } from "./Board";
import type { TetrominoType } from "./Cell";
import type { Point } from "./Tetromino";
import type { LastRotation } from "./rotation/RotationAttemptResult";
import type { RotationState } from "./rotation/RotationState";
import { Srs180KickTableProvider } from "./rotation/Srs180KickTables";
import { SrsKickTableProvider } from "./rotation/SrsKickTables";
import { toRotationTransition } from "./rotation/RotationTransition";
import { normalizeRotationState } from "./rotation/RotationState";

export type SpinKind = "None" | "TSpin" | "AllSpin";
export type SpinGrade = "None" | "Mini" | "Full";
export type SpinMethod = "None" | "TCorner" | "Immobile";

export type SpinResult = {
  kind: SpinKind;
  grade: SpinGrade;
  pieceType: TetrominoType | null;
  method: SpinMethod;
  rotationState: RotationState | null;
  kickIndex: number | null;
};

export const noSpinResult = (): SpinResult => ({
  kind: "None",
  grade: "None",
  pieceType: null,
  method: "None",
  rotationState: null,
  kickIndex: null,
});

export type LastSpinAction = LastRotation & { success: true };

export interface SpinDetector {
  detect(board: Board, piece: ActivePiece, lastSpinAction?: LastSpinAction): SpinResult;
}

export class SrsSpinDetector implements SpinDetector {
  private readonly srs90 = new SrsKickTableProvider();
  private readonly srs180 = new Srs180KickTableProvider();

  detect(board: Board, piece: ActivePiece, lastSpinAction?: LastSpinAction): SpinResult {
    if (!lastSpinAction || !lastSpinAction.success || lastSpinAction.pieceType !== piece.type) return noSpinResult();
    if (piece.type === "T") return this.detectTSpin(board, piece, lastSpinAction);
    return this.detectAllSpin(board, piece, lastSpinAction);
  }

  private detectTSpin(board: Board, piece: ActivePiece, lastSpinAction: LastSpinAction): SpinResult {
    const metadata = this.resultMetadata(piece, lastSpinAction);

    const corners = this.corners(piece.position);
    const occupiedCorners = corners.filter((corner) => board.getCell(corner.x, corner.y).filled);
    if (occupiedCorners.length < 3) return noSpinResult();

    const frontCorners = this.frontCorners(piece.position, piece.rotation);
    const occupiedFrontCorners = frontCorners.filter((corner) => board.getCell(corner.x, corner.y).filled).length;
    if (occupiedFrontCorners === 2) return { ...metadata, kind: "TSpin", grade: "Full", method: "TCorner" };
    if (occupiedFrontCorners !== 1) return noSpinResult();

    return {
      ...metadata,
      kind: "TSpin",
      grade: this.isLastKickCandidate(lastSpinAction) ? "Full" : "Mini",
      method: "TCorner",
    };
  }

  private detectAllSpin(board: Board, piece: ActivePiece, lastSpinAction: LastSpinAction): SpinResult {
    if (piece.type === "O") return noSpinResult();
    const allSpinPieces: TetrominoType[] = ["I", "J", "L", "S", "Z"];
    if (!allSpinPieces.includes(piece.type)) return noSpinResult();

    const immobile = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ].every((offset) => !board.canPlace(piece.move(offset.x, offset.y)));

    if (!immobile) return noSpinResult();
    return { ...this.resultMetadata(piece, lastSpinAction), kind: "AllSpin", grade: "Full", method: "Immobile" };
  }

  private corners(center: Point): Point[] {
    return [
      { x: center.x - 1, y: center.y - 1 },
      { x: center.x + 1, y: center.y - 1 },
      { x: center.x - 1, y: center.y + 1 },
      { x: center.x + 1, y: center.y + 1 },
    ];
  }

  private frontCorners(center: Point, rotation: ActivePiece["rotation"]): Point[] {
    const normalized = normalizeRotationState(rotation);
    if (normalized === "0") return [{ x: center.x - 1, y: center.y - 1 }, { x: center.x + 1, y: center.y - 1 }];
    if (normalized === "R") return [{ x: center.x + 1, y: center.y - 1 }, { x: center.x + 1, y: center.y + 1 }];
    if (normalized === "2") return [{ x: center.x - 1, y: center.y + 1 }, { x: center.x + 1, y: center.y + 1 }];
    return [{ x: center.x - 1, y: center.y - 1 }, { x: center.x - 1, y: center.y + 1 }];
  }

  private isLastKickCandidate(lastSpinAction: LastSpinAction): boolean {
    const transition = toRotationTransition(lastSpinAction.from, lastSpinAction.to);
    const table = {
      ...this.srs90.getKickTable("T", lastSpinAction.direction),
      ...this.srs180.getKickTable("T", lastSpinAction.direction),
    };
    const candidates = table[transition] ?? [{ x: 0, y: 0 }];
    return lastSpinAction.usedKickIndex === candidates.length - 1;
  }

  private resultMetadata(piece: ActivePiece, lastSpinAction: LastSpinAction): Pick<SpinResult, "pieceType" | "rotationState" | "kickIndex"> {
    return {
      pieceType: piece.type,
      rotationState: normalizeRotationState(piece.rotation),
      kickIndex: lastSpinAction.usedKickIndex ?? null,
    };
  }
}

export class SrsTSpinDetector extends SrsSpinDetector {}

export class BasicSpinDetector extends SrsSpinDetector {}
