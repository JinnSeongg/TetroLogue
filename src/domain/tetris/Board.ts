import type { Cell } from "./Cell";
import { emptyCell } from "./Cell";
import type { ActivePiece } from "./ActivePiece";
import type { Point } from "./Tetromino";

export type CanPlaceFailureReason = "outOfBoundsLeft" | "outOfBoundsRight" | "outOfBoundsBottom" | "occupied" | "invalidTopHandling";

export type CanPlaceDetail = {
  canPlace: boolean;
  failures: Array<{
    block: Point;
    reason: CanPlaceFailureReason;
  }>;
};

export class Board {
  private readonly cells: Cell[][];

  constructor(
    public readonly width: number,
    public readonly height: number,
    cells?: Cell[][],
  ) {
    this.cells = cells ?? Array.from({ length: height }, () => Array.from({ length: width }, emptyCell));
  }

  static create(width = 10, height = 20): Board {
    return new Board(width, height);
  }

  getCell(x: number, y: number): Cell {
    if (!this.isInside(x, y)) return { filled: true };
    return this.cells[y][x];
  }

  isInside(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  canPlace(piece: ActivePiece): boolean {
    return this.canPlaceDetailed(piece).canPlace;
  }

  canPlaceDetailed(piece: ActivePiece): CanPlaceDetail {
    const failures: CanPlaceDetail["failures"] = [];
    for (const block of piece.blocks()) {
      if (block.x < 0) {
        failures.push({ block, reason: "outOfBoundsLeft" });
        continue;
      }
      if (block.x >= this.width) {
        failures.push({ block, reason: "outOfBoundsRight" });
        continue;
      }
      if (block.y >= this.height) {
        failures.push({ block, reason: "outOfBoundsBottom" });
        continue;
      }
      if (block.y < 0) {
        continue;
      }
      if (this.getCell(block.x, block.y).filled) {
        failures.push({ block, reason: "occupied" });
      }
    }
    return { canPlace: failures.length === 0, failures };
  }

  place(piece: ActivePiece): Board {
    const next = this.cloneCells();
    for (const block of piece.blocks()) {
      if (this.isInside(block.x, block.y)) {
        next[block.y][block.x] = { filled: true, pieceType: piece.type };
      }
    }
    return new Board(this.width, this.height, next);
  }

  withFilledRow(y: number): Board {
    const next = this.cloneCells();
    next[y] = Array.from({ length: this.width }, () => ({ filled: true, pieceType: "I" as const }));
    return new Board(this.width, this.height, next);
  }

  clearFullLines(): { board: Board; linesCleared: number; clearedRows: number[] } {
    const remaining = this.cells.filter((row) => !row.every((cell) => cell.filled));
    const linesCleared = this.height - remaining.length;
    const clearedRows = this.cells
      .map((row, index) => (row.every((cell) => cell.filled) ? index : -1))
      .filter((index) => index >= 0);
    const emptyRows = Array.from({ length: linesCleared }, () => Array.from({ length: this.width }, emptyCell));
    return {
      board: new Board(this.width, this.height, [...emptyRows, ...remaining]),
      linesCleared,
      clearedRows,
    };
  }

  insertGarbageLines(lines: number, holeX: number): { board: Board; overflow: boolean } {
    if (lines <= 0) return { board: this, overflow: false };
    const overflowRows = this.cells.slice(0, lines);
    const shiftedRows = this.cells.slice(lines);
    const garbageRows = Array.from({ length: lines }, () =>
      Array.from({ length: this.width }, (_, x) => (x === holeX ? emptyCell() : { filled: true, pieceType: "Z" as const, isGarbage: true })),
    );

    return {
      board: new Board(this.width, this.height, [...shiftedRows, ...garbageRows]),
      overflow: overflowRows.some((row) => row.some((cell) => cell.filled)),
    };
  }

  isPerfectClear(): boolean {
    return this.cells.every((row) => row.every((cell) => !cell.filled));
  }

  snapshot(): Cell[][] {
    return this.cloneCells();
  }

  private cloneCells(): Cell[][] {
    return this.cells.map((row) => row.map((cell) => ({ ...cell })));
  }
}
