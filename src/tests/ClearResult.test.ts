import { describe, expect, it } from "vitest";
import { createClearResult } from "../domain/tetris/ClearResult";
import type { SpinResult } from "../domain/tetris/SpinDetector";

const tSpin = (grade: SpinResult["grade"]): SpinResult => ({
  kind: "TSpin",
  grade,
  pieceType: "T",
  method: "TCorner",
  rotationState: "0",
  kickIndex: 0,
});

describe("ClearResult", () => {
  it.each([
    [1, "Single"],
    [2, "Double"],
    [3, "Triple"],
    [4, "Tetris"],
  ])("classifies %i line clears", (linesCleared, displayName) => {
    const result = createClearResult({ linesCleared });

    expect(result.lineClearName).toBe(displayName);
    expect(result.displayName).toBe(displayName);
  });

  it.each([
    [1, "T-Spin Single"],
    [2, "T-Spin Double"],
    [3, "T-Spin Triple"],
  ])("creates T-Spin display names for %i line clears", (linesCleared, displayName) => {
    const result = createClearResult({ linesCleared, spinResult: tSpin("Full") });

    expect(result.isTSpin).toBe(true);
    expect(result.isTSpinMini).toBe(false);
    expect(result.displayName).toBe(displayName);
  });

  it("creates T-Spin Mini display names", () => {
    const result = createClearResult({ linesCleared: 1, spinResult: tSpin("Mini") });

    expect(result.isTSpin).toBe(true);
    expect(result.isTSpinMini).toBe(true);
    expect(result.displayName).toBe("T-Spin Mini Single");
  });

  it("uses Perfect Clear as the UI display name when present", () => {
    const result = createClearResult({ linesCleared: 4, isPerfectClear: true });

    expect(result.isPerfectClear).toBe(true);
    expect(result.displayName).toBe("Perfect Clear");
  });

  it("keeps cleared row positions for render-only effects", () => {
    const result = createClearResult({ linesCleared: 2, clearedRows: [18, 19] });

    expect(result.clearedRows).toEqual([18, 19]);
  });
});
