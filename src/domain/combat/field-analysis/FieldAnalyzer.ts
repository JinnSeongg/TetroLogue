import type { Board } from "../../tetris/Board";
import { CleanFieldDetector } from "./CleanFieldDetector";
import { ColumnHeightAnalyzer } from "./ColumnHeightAnalyzer";
import { DangerStateEvaluator } from "./DangerStateEvaluator";
import { defaultFieldAnalysisConfig, type FieldAnalysisConfig } from "./FieldAnalysisConfig";
import type { FieldAnalysisResult } from "./FieldAnalysisTypes";
import { GarbagePressureAnalyzer } from "./GarbagePressureAnalyzer";
import { HoleAnalyzer } from "./HoleAnalyzer";
import { StackHeightEvaluator } from "./StackHeightEvaluator";
import { WellAnalyzer } from "./WellAnalyzer";

export class FieldAnalyzer {
  constructor(
    private readonly columnHeightAnalyzer = new ColumnHeightAnalyzer(),
    private readonly stackHeightEvaluator = new StackHeightEvaluator(),
    private readonly holeAnalyzer = new HoleAnalyzer(),
    private readonly garbagePressureAnalyzer = new GarbagePressureAnalyzer(),
    private readonly wellAnalyzer = new WellAnalyzer(),
    private readonly cleanFieldDetector = new CleanFieldDetector(),
    private readonly dangerStateEvaluator = new DangerStateEvaluator(),
  ) {}

  analyze(board: Board, config: FieldAnalysisConfig = defaultFieldAnalysisConfig): FieldAnalysisResult {
    const columnHeights = this.columnHeightAnalyzer.analyze(board, config);
    const maxHeight = columnHeights.length > 0 ? Math.max(...columnHeights) : 0;
    const minHeight = columnHeights.length > 0 ? Math.min(...columnHeights) : 0;
    const averageHeight = columnHeights.length > 0 ? columnHeights.reduce((total, height) => total + height, 0) / columnHeights.length : 0;
    const bumpiness = columnHeights.slice(1).reduce((total, height, index) => total + Math.abs(columnHeights[index] - height), 0);
    const stackHeight = this.stackHeightEvaluator.evaluate(maxHeight, config);
    const holes = this.holeAnalyzer.analyze(board, config);
    const garbagePressure = this.garbagePressureAnalyzer.analyze(board, config);
    const well = this.wellAnalyzer.analyze(columnHeights, config);
    const cleanField = this.cleanFieldDetector.detect(
      {
        maxHeight,
        holeCount: holes.holeCount,
        bumpiness,
        garbageRowCount: garbagePressure.garbageRowCount,
        stackLevel: stackHeight.stackLevel,
      },
      config,
    );
    const dangerState = this.dangerStateEvaluator.evaluate(
      {
        maxHeight,
        holeCount: holes.holeCount,
        garbageRowCount: garbagePressure.garbageRowCount,
        bumpiness,
      },
      config,
    );

    return {
      boardWidth: columnHeights.length,
      boardHeight: Math.min(config.visibleHeight, board.height),
      columnHeights,
      maxHeight,
      minHeight,
      averageHeight,
      bumpiness,
      holeCount: holes.holeCount,
      columnHoleCounts: holes.columnHoleCounts,
      hasManyHoles: holes.hasManyHoles,
      garbageCellCount: garbagePressure.garbageCellCount,
      garbageRowCount: garbagePressure.garbageRowCount,
      highestGarbageHeight: garbagePressure.highestGarbageHeight,
      garbagePressure: garbagePressure.garbagePressure,
      garbagePressureLevel: garbagePressure.garbagePressureLevel,
      wellDepths: well.wellDepths,
      deepestWellDepth: well.deepestWellDepth,
      wellColumn: well.wellColumn,
      hasDeepWell: well.hasDeepWell,
      isCleanField: cleanField.isCleanField,
      cleanFieldScore: cleanField.cleanFieldScore,
      stackLevel: stackHeight.stackLevel,
      dangerLevel: dangerState.dangerLevel,
      dangerScore: dangerState.dangerScore,
      dangerReasons: dangerState.dangerReasons,
      tags: [...stackHeight.tags, ...holes.tags, ...garbagePressure.tags, ...well.tags, ...cleanField.tags, ...dangerState.tags],
    };
  }
}
