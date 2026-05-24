import { describe, expect, it } from "vitest";
import { Board } from "../domain/tetris/Board";
import type { Cell } from "../domain/tetris/Cell";
import { FieldAnalyzer } from "../domain/combat/field-analysis/FieldAnalyzer";
import { defaultFieldAnalysisConfig, type FieldAnalysisConfig } from "../domain/combat/field-analysis/FieldAnalysisConfig";
import { HoleAnalyzer } from "../domain/combat/field-analysis/HoleAnalyzer";

describe("HoleAnalyzer", () => {
  it("returns 0 holes for an empty board", () => {
    const result = new HoleAnalyzer().analyze(Board.create(), configFor(10, 20));

    expect(result.holeCount).toBe(0);
    expect(result.columnHoleCounts).toEqual(Array.from({ length: 10 }, () => 0));
  });

  it("returns 0 holes for a column with only a bottom block", () => {
    const board = createBoardFromColumns([[".", ".", ".", "X"]]);

    expect(new HoleAnalyzer().analyze(board, configFor(1, 4)).holeCount).toBe(0);
  });

  it("counts an empty cell below an upper block as one hole", () => {
    const board = createBoardFromColumns([[".", "X", ".", "X"]]);

    expect(new HoleAnalyzer().analyze(board, configFor(1, 4))).toMatchObject({
      holeCount: 1,
      columnHoleCounts: [1],
    });
  });

  it("counts multiple holes in one column", () => {
    const board = createBoardFromColumns([["X", ".", ".", "X", "."]]);

    expect(new HoleAnalyzer().analyze(board, configFor(1, 5))).toMatchObject({
      holeCount: 3,
      columnHoleCounts: [3],
    });
  });

  it("sums holes across multiple columns", () => {
    const board = createBoardFromColumns([
      [".", "X", ".", "X"],
      ["X", ".", "X", "."],
      [".", ".", ".", "X"],
    ]);

    expect(new HoleAnalyzer().analyze(board, configFor(3, 4))).toMatchObject({
      holeCount: 3,
      columnHoleCounts: [1, 2, 0],
    });
  });

  it("treats garbage cells as occupied while counting holes", () => {
    const board = createBoardFromColumns([["G", ".", "X"]]);

    expect(new HoleAnalyzer().analyze(board, configFor(1, 3))).toMatchObject({
      holeCount: 1,
      columnHoleCounts: [1],
    });
  });

  it("changes ManyHoles tagging when config thresholds change", () => {
    const board = createBoardFromColumns([["X", ".", ".", "X"]]);
    const result = new FieldAnalyzer().analyze(board, {
      ...configFor(1, 4),
      fewHolesMax: 0,
      manyHolesThreshold: 2,
      criticalHolesThreshold: 4,
    });

    expect(result.holeCount).toBe(2);
    expect(result.hasManyHoles).toBe(true);
    expect(result.tags).toContain("ManyHoles");
    expect(result.tags).not.toContain("FewHoles");
  });

  it("does not modify the board", () => {
    const board = createBoardFromColumns([["X", ".", "X"]]);
    const before = board.snapshot();

    new HoleAnalyzer().analyze(board, configFor(1, 3));

    expect(board.snapshot()).toEqual(before);
  });
});

function configFor(boardWidth: number, visibleHeight: number): FieldAnalysisConfig {
  return {
    ...defaultFieldAnalysisConfig,
    boardWidth,
    visibleHeight,
  };
}

function createBoardFromColumns(columns: string[][]): Board {
  const width = columns.length;
  const height = columns[0]?.length ?? 0;
  const cells: Cell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const value = columns[x][y];
      if (value === "G") return { filled: true, pieceType: "Z" as const };
      if (value === "X") return { filled: true, pieceType: "I" as const };
      return { filled: false };
    }),
  );

  return new Board(width, height, cells);
}
