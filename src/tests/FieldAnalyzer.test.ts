import { describe, expect, it } from "vitest";
import { Board } from "../domain/tetris/Board";
import type { Cell } from "../domain/tetris/Cell";
import { FieldAnalyzer } from "../domain/combat/field-analysis/FieldAnalyzer";
import { ColumnHeightAnalyzer } from "../domain/combat/field-analysis/ColumnHeightAnalyzer";
import { defaultFieldAnalysisConfig, type FieldAnalysisConfig } from "../domain/combat/field-analysis/FieldAnalysisConfig";

describe("FieldAnalyzer", () => {
  it("returns zero column heights for an empty board", () => {
    const result = new FieldAnalyzer().analyze(Board.create());

    expect(result.columnHeights).toEqual(Array.from({ length: defaultFieldAnalysisConfig.boardWidth }, () => 0));
    expect(result.maxHeight).toBe(0);
    expect(result.minHeight).toBe(0);
    expect(result.holeCount).toBe(0);
    expect(result.columnHoleCounts).toEqual(Array.from({ length: defaultFieldAnalysisConfig.boardWidth }, () => 0));
    expect(result.hasManyHoles).toBe(false);
    expect(result.garbageCellCount).toBe(0);
    expect(result.garbageRowCount).toBe(0);
    expect(result.highestGarbageHeight).toBe(0);
    expect(result.garbagePressure).toBe(0);
    expect(result.garbagePressureLevel).toBe("None");
    expect(result.wellDepths).toEqual(Array.from({ length: defaultFieldAnalysisConfig.boardWidth }, () => 0));
    expect(result.deepestWellDepth).toBe(0);
    expect(result.wellColumn).toBeNull();
    expect(result.hasDeepWell).toBe(false);
    expect(result.isCleanField).toBe(true);
    expect(result.cleanFieldScore).toBe(100);
    expect(result.stackLevel).toBe("Low");
    expect(result.dangerLevel).toBe("Safe");
    expect(result.dangerScore).toBe(0);
    expect(result.dangerReasons).toEqual([]);
    expect(result.tags).toContain("LowStack");
    expect(result.tags).toContain("FewHoles");
    expect(result.tags).toContain("CleanField");
  });

  it("returns height 1 when only one bottom cell is occupied", () => {
    const board = createBoardFromHeights([0, 1, 0]);

    expect(new ColumnHeightAnalyzer().analyze(board, configFor(3, 20))).toEqual([0, 1, 0]);
  });

  it("returns height 5 when one column is stacked five cells high", () => {
    const board = createBoardFromHeights([0, 5, 0]);

    expect(new ColumnHeightAnalyzer().analyze(board, configFor(3, 20))).toEqual([0, 5, 0]);
  });

  it("calculates max, min, and average height", () => {
    const board = createBoardFromHeights([0, 2, 4, 6]);
    const result = new FieldAnalyzer().analyze(board, configFor(4, 20));

    expect(result.maxHeight).toBe(6);
    expect(result.minHeight).toBe(0);
    expect(result.averageHeight).toBe(3);
  });

  it("calculates bumpiness from adjacent column height differences", () => {
    const board = createBoardFromHeights([0, 2, 5]);
    const result = new FieldAnalyzer().analyze(board, configFor(3, 20));

    expect(result.bumpiness).toBe(5);
  });

  it("does not modify the board while analyzing", () => {
    const board = createBoardFromHeights([0, 2, 5]);
    const before = board.snapshot();

    new FieldAnalyzer().analyze(board, configFor(3, 20));

    expect(board.snapshot()).toEqual(before);
  });

  it("uses default config when no config is passed", () => {
    const result = new FieldAnalyzer().analyze(Board.create());

    expect(result.boardWidth).toBe(defaultFieldAnalysisConfig.boardWidth);
    expect(result.boardHeight).toBe(defaultFieldAnalysisConfig.visibleHeight);
  });

  it("uses a provided config", () => {
    const board = createBoardFromHeights([0, 0, 0, 0], 6);
    const result = new FieldAnalyzer().analyze(board, configFor(4, 6));

    expect(result.boardWidth).toBe(4);
    expect(result.boardHeight).toBe(6);
    expect(result.columnHeights).toEqual([0, 0, 0, 0]);
  });

  it("classifies maxHeight 9 as Low with default thresholds", () => {
    const result = new FieldAnalyzer().analyze(createBoardFromHeights([9]), configFor(1, 20));

    expect(result.stackLevel).toBe("Low");
    expect(result.tags).toContain("LowStack");
    expect(result.tags).not.toContain("MidStack");
  });

  it("classifies maxHeight 10 as Mid with default thresholds", () => {
    const result = new FieldAnalyzer().analyze(createBoardFromHeights([10]), configFor(1, 20));

    expect(result.stackLevel).toBe("Mid");
    expect(result.tags).toContain("MidStack");
    expect(result.tags).not.toContain("LowStack");
  });

  it("classifies maxHeight 15 as High with default thresholds", () => {
    const result = new FieldAnalyzer().analyze(createBoardFromHeights([15]), configFor(1, 20));

    expect(result.stackLevel).toBe("High");
    expect(result.tags).toContain("HighStack");
    expect(result.tags).not.toContain("CriticalStack");
  });

  it("classifies maxHeight 18 as Critical with default thresholds", () => {
    const result = new FieldAnalyzer().analyze(createBoardFromHeights([18]), configFor(1, 20));

    expect(result.stackLevel).toBe("Critical");
    expect(result.tags).toContain("HighStack");
    expect(result.tags).toContain("CriticalStack");
  });

  it("changes stack classification when config thresholds change", () => {
    const result = new FieldAnalyzer().analyze(createBoardFromHeights([6]), {
      ...configFor(1, 20),
      lowStackMaxHeight: 3,
      midStackMaxHeight: 5,
      highStackThreshold: 6,
      criticalStackThreshold: 8,
    });

    expect(result.stackLevel).toBe("High");
    expect(result.tags).toContain("HighStack");
  });

  it("includes well analysis from column heights", () => {
    const result = new FieldAnalyzer().analyze(createBoardFromHeights([5, 1, 5]), configFor(3, 20));

    expect(result.wellDepths).toEqual([0, 4, 0]);
    expect(result.deepestWellDepth).toBe(4);
    expect(result.wellColumn).toBe(1);
    expect(result.hasDeepWell).toBe(true);
    expect(result.tags).toContain("HasWell");
    expect(result.tags).toContain("DeepWell");
  });
});

function configFor(boardWidth: number, visibleHeight: number): FieldAnalysisConfig {
  return {
    ...defaultFieldAnalysisConfig,
    boardWidth,
    visibleHeight,
  };
}

function createBoardFromHeights(heights: number[], height = 20): Board {
  const cells: Cell[][] = Array.from({ length: height }, (_, y) =>
    heights.map((columnHeight) => ({
      filled: y >= height - columnHeight,
      pieceType: y >= height - columnHeight ? ("I" as const) : undefined,
    })),
  );

  return new Board(heights.length, height, cells);
}
