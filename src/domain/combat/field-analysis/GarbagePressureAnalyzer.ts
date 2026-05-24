import type { Board } from "../../tetris/Board";
import type { FieldAnalysisConfig } from "./FieldAnalysisConfig";
import type { FieldAnalysisTag, GarbagePressureLevel } from "./FieldAnalysisTypes";

export type GarbagePressureAnalysisResult = {
  garbageCellCount: number;
  garbageRowCount: number;
  highestGarbageHeight: number;
  garbagePressure: number;
  garbagePressureLevel: GarbagePressureLevel;
  tags: FieldAnalysisTag[];
};

export class GarbagePressureAnalyzer {
  analyze(board: Board, config: FieldAnalysisConfig): GarbagePressureAnalysisResult {
    const visibleHeight = Math.min(config.visibleHeight, board.height);
    const visibleTopY = board.height - visibleHeight;
    const boardWidth = Math.min(config.boardWidth, board.width);
    const garbageRows = new Set<number>();
    let garbageCellCount = 0;
    let highestGarbageY: number | undefined;

    for (let y = visibleTopY; y < board.height; y += 1) {
      for (let x = 0; x < boardWidth; x += 1) {
        if (board.getCell(x, y).isGarbage) {
          garbageCellCount += 1;
          garbageRows.add(y);
          highestGarbageY = highestGarbageY === undefined ? y : Math.min(highestGarbageY, y);
        }
      }
    }

    const garbageRowCount = garbageRows.size;
    const highestGarbageHeight = highestGarbageY === undefined ? 0 : board.height - highestGarbageY;
    const garbagePressure = visibleHeight > 0 ? garbageRowCount / visibleHeight : 0;
    const garbagePressureLevel = this.getPressureLevel(garbageRowCount, config);

    return {
      garbageCellCount,
      garbageRowCount,
      highestGarbageHeight,
      garbagePressure,
      garbagePressureLevel,
      tags: this.getTags(garbageCellCount, garbageRowCount, config),
    };
  }

  private getPressureLevel(garbageRowCount: number, config: FieldAnalysisConfig): GarbagePressureLevel {
    if (garbageRowCount <= 0) return "None";
    if (garbageRowCount >= config.garbagePressureCriticalRows) return "Critical";
    if (garbageRowCount >= config.garbagePressureDangerRows) return "High";
    if (garbageRowCount >= config.garbagePressureWarningRows) return "Medium";
    return "Low";
  }

  private getTags(garbageCellCount: number, garbageRowCount: number, config: FieldAnalysisConfig): FieldAnalysisTag[] {
    const tags: FieldAnalysisTag[] = [];

    if (garbageCellCount > 0) tags.push("HasGarbage");
    if (garbageRowCount >= config.garbagePressureWarningRows) tags.push("GarbagePressure");
    if (garbageRowCount >= config.garbagePressureDangerRows) tags.push("HeavyGarbagePressure");
    if (garbageRowCount >= config.garbagePressureCriticalRows) tags.push("CriticalGarbagePressure");

    return tags;
  }
}
