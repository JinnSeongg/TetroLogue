import type { Board } from "../../tetris/Board";
import type { FieldAnalysisConfig } from "./FieldAnalysisConfig";

export class ColumnHeightAnalyzer {
  analyze(board: Board, config: FieldAnalysisConfig): number[] {
    const visibleHeight = Math.min(config.visibleHeight, board.height);
    const visibleTopY = board.height - visibleHeight;
    const boardWidth = Math.min(config.boardWidth, board.width);

    return Array.from({ length: boardWidth }, (_, x) => this.getColumnHeight(board, x, visibleTopY));
  }

  private getColumnHeight(board: Board, x: number, visibleTopY: number): number {
    for (let y = visibleTopY; y < board.height; y += 1) {
      if (board.getCell(x, y).filled) {
        return board.height - y;
      }
    }

    return 0;
  }
}
