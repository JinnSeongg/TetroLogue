import type { Board } from "./Board";

export class LineClearDetector {
  detectAndClear(board: Board): { board: Board; linesCleared: number; clearedRows: number[] } {
    return board.clearFullLines();
  }
}
