import type { Board } from "../../tetris/Board";
import type { FieldAnalysisConfig } from "./FieldAnalysisConfig";
import type { FieldAnalysisTag } from "./FieldAnalysisTypes";

export type HoleAnalysisResult = {
  holeCount: number;
  columnHoleCounts: number[];
  hasManyHoles: boolean;
  tags: FieldAnalysisTag[];
};

export class HoleAnalyzer {
  analyze(board: Board, config: FieldAnalysisConfig): HoleAnalysisResult {
    const visibleHeight = Math.min(config.visibleHeight, board.height);
    const visibleTopY = board.height - visibleHeight;
    const boardWidth = Math.min(config.boardWidth, board.width);
    const columnHoleCounts = Array.from({ length: boardWidth }, (_, x) => this.countColumnHoles(board, x, visibleTopY));
    const holeCount = columnHoleCounts.reduce((total, holes) => total + holes, 0);

    return {
      holeCount,
      columnHoleCounts,
      hasManyHoles: holeCount >= config.manyHolesThreshold,
      tags: this.getTags(holeCount, config),
    };
  }

  private countColumnHoles(board: Board, x: number, visibleTopY: number): number {
    let hasBlockAbove = false;
    let holes = 0;

    for (let y = visibleTopY; y < board.height; y += 1) {
      if (board.getCell(x, y).filled) {
        hasBlockAbove = true;
      } else if (hasBlockAbove) {
        holes += 1;
      }
    }

    return holes;
  }

  private getTags(holeCount: number, config: FieldAnalysisConfig): FieldAnalysisTag[] {
    const tags: FieldAnalysisTag[] = [];

    if (holeCount <= config.fewHolesMax) {
      tags.push("FewHoles");
    }

    if (holeCount >= config.manyHolesThreshold) {
      tags.push("ManyHoles");
    }

    if (holeCount >= config.criticalHolesThreshold) {
      tags.push("CriticalHoles");
    }

    return tags;
  }
}
