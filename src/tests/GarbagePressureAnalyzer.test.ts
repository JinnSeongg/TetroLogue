import { describe, expect, it } from "vitest";
import { FieldAnalyzer } from "../domain/combat/field-analysis/FieldAnalyzer";
import { defaultFieldAnalysisConfig, type FieldAnalysisConfig } from "../domain/combat/field-analysis/FieldAnalysisConfig";
import { GarbagePressureAnalyzer } from "../domain/combat/field-analysis/GarbagePressureAnalyzer";
import { Board } from "../domain/tetris/Board";
import type { Cell } from "../domain/tetris/Cell";

describe("GarbagePressureAnalyzer", () => {
  it("returns zero garbage metrics when no garbage exists", () => {
    const result = new GarbagePressureAnalyzer().analyze(Board.create(), configFor(10, 20));

    expect(result.garbageCellCount).toBe(0);
    expect(result.garbageRowCount).toBe(0);
    expect(result.garbagePressureLevel).toBe("None");
  });

  it("counts one garbage row", () => {
    const board = createBoardFromRows([
      "....",
      "....",
      "G.G.",
      "....",
    ]);

    const result = new GarbagePressureAnalyzer().analyze(board, configFor(4, 4));

    expect(result.garbageCellCount).toBe(2);
    expect(result.garbageRowCount).toBe(1);
  });

  it("counts multiple garbage rows accurately", () => {
    const board = createBoardFromRows([
      "G...",
      "....",
      ".G..",
      "..G.",
    ]);

    expect(new GarbagePressureAnalyzer().analyze(board, configFor(4, 4)).garbageRowCount).toBe(3);
  });

  it("counts a row once even when it has multiple garbage cells", () => {
    const board = createBoardFromRows([
      "....",
      "GGG.",
      "....",
      "....",
    ]);

    const result = new GarbagePressureAnalyzer().analyze(board, configFor(4, 4));

    expect(result.garbageCellCount).toBe(3);
    expect(result.garbageRowCount).toBe(1);
  });

  it("calculates highest garbage height from the bottom", () => {
    const board = createBoardFromRows([
      "....",
      ".G..",
      "....",
      "G...",
    ]);

    expect(new GarbagePressureAnalyzer().analyze(board, configFor(4, 4)).highestGarbageHeight).toBe(3);
  });

  it("uses config thresholds for warning, danger, and critical pressure levels", () => {
    const board = createBoardFromRows([
      "G",
      "G",
      "G",
      "G",
    ]);
    const warning = new FieldAnalyzer().analyze(board, {
      ...configFor(1, 4),
      garbagePressureWarningRows: 2,
      garbagePressureDangerRows: 4,
      garbagePressureCriticalRows: 5,
    });
    const critical = new FieldAnalyzer().analyze(board, {
      ...configFor(1, 4),
      garbagePressureWarningRows: 1,
      garbagePressureDangerRows: 2,
      garbagePressureCriticalRows: 4,
    });

    expect(warning.garbagePressureLevel).toBe("High");
    expect(warning.tags).toContain("HeavyGarbagePressure");
    expect(warning.tags).not.toContain("CriticalGarbagePressure");
    expect(critical.garbagePressureLevel).toBe("Critical");
    expect(critical.tags).toContain("CriticalGarbagePressure");
  });

  it("does not count normal mino cells as garbage", () => {
    const board = createBoardFromRows([
      "M...",
      ".G..",
    ]);

    const result = new GarbagePressureAnalyzer().analyze(board, configFor(4, 2));

    expect(result.garbageCellCount).toBe(1);
    expect(result.garbageRowCount).toBe(1);
  });

  it("does not modify the board", () => {
    const board = createBoardFromRows([
      ".G",
      "M.",
    ]);
    const before = board.snapshot();

    new GarbagePressureAnalyzer().analyze(board, configFor(2, 2));

    expect(board.snapshot()).toEqual(before);
  });

  it("marks inserted garbage cells with metadata", () => {
    const result = Board.create(4, 4).insertGarbageLines(1, 2);
    const bottom = result.board.snapshot()[3];

    expect(bottom.filter((cell) => cell.isGarbage)).toHaveLength(3);
    expect(bottom[2].isGarbage).toBeUndefined();
  });
});

function configFor(boardWidth: number, visibleHeight: number): FieldAnalysisConfig {
  return {
    ...defaultFieldAnalysisConfig,
    boardWidth,
    visibleHeight,
  };
}

function createBoardFromRows(rows: string[]): Board {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const cells: Cell[][] = rows.map((row) =>
    Array.from(row, (value) => {
      if (value === "G") return { filled: true, pieceType: "Z" as const, isGarbage: true };
      if (value === "M") return { filled: true, pieceType: "I" as const };
      return { filled: false };
    }),
  );

  return new Board(width, height, cells);
}
