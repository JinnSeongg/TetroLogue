import { describe, expect, it } from "vitest";
import { CleanFieldDetector, type CleanFieldInput } from "../domain/combat/field-analysis/CleanFieldDetector";
import { defaultFieldAnalysisConfig, type FieldAnalysisConfig } from "../domain/combat/field-analysis/FieldAnalysisConfig";
import { FieldAnalyzer } from "../domain/combat/field-analysis/FieldAnalyzer";
import { Board } from "../domain/tetris/Board";
import type { Cell } from "../domain/tetris/Cell";

describe("CleanFieldDetector", () => {
  it("marks a low flat field with no holes as clean", () => {
    const result = new CleanFieldDetector().detect(input({ maxHeight: 4, holeCount: 0, bumpiness: 0, garbageRowCount: 0 }), config());

    expect(result.isCleanField).toBe(true);
    expect(result.cleanFieldScore).toBe(100);
    expect(result.tags).toContain("CleanField");
  });

  it("does not mark clean when maxHeight exceeds the threshold", () => {
    const result = new CleanFieldDetector().detect(input({ maxHeight: 11 }), config());

    expect(result.isCleanField).toBe(false);
    expect(result.tags).not.toContain("CleanField");
  });

  it("does not mark clean when holeCount exceeds the threshold", () => {
    const result = new CleanFieldDetector().detect(input({ holeCount: 2 }), config());

    expect(result.isCleanField).toBe(false);
  });

  it("does not mark clean when bumpiness exceeds the threshold", () => {
    const result = new CleanFieldDetector().detect(input({ bumpiness: 9 }), config());

    expect(result.isCleanField).toBe(false);
  });

  it("does not mark clean when garbageRowCount exceeds the threshold", () => {
    const result = new CleanFieldDetector().detect(input({ garbageRowCount: 3 }), config());

    expect(result.isCleanField).toBe(false);
  });

  it("changes clean field judgment when config changes", () => {
    const strict = new CleanFieldDetector().detect(input({ maxHeight: 8 }), { ...config(), cleanFieldMaxHeight: 7 });
    const relaxed = new CleanFieldDetector().detect(input({ maxHeight: 8 }), { ...config(), cleanFieldMaxHeight: 8 });

    expect(strict.isCleanField).toBe(false);
    expect(relaxed.isCleanField).toBe(true);
  });

  it("adds CleanField tag through FieldAnalyzer", () => {
    const result = new FieldAnalyzer().analyze(createBoardFromHeights([2, 2, 2]), { ...config(), boardWidth: 3 });

    expect(result.isCleanField).toBe(true);
    expect(result.cleanFieldScore).toBe(100);
    expect(result.tags).toContain("CleanField");
  });

  it("can add StableField tag from config-driven thresholds", () => {
    const result = new CleanFieldDetector().detect(input({ maxHeight: 3, holeCount: 0, bumpiness: 0, garbageRowCount: 0 }), config());

    expect(result.tags).toContain("StableField");
  });

  it("uses analysis input only and does not require a Board", () => {
    const detector = new CleanFieldDetector();

    expect(detector.detect(input({ maxHeight: 1 }), config()).isCleanField).toBe(true);
  });
});

function config(): FieldAnalysisConfig {
  return { ...defaultFieldAnalysisConfig };
}

function input(overrides: Partial<CleanFieldInput>): CleanFieldInput {
  return {
    maxHeight: 0,
    holeCount: 0,
    bumpiness: 0,
    garbageRowCount: 0,
    stackLevel: "Low",
    ...overrides,
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
