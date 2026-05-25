import { describe, expect, it } from "vitest";
import { ComboB2BTracker } from "../domain/combat/ComboB2BTracker";
import { createClearResult } from "../domain/tetris/ClearResult";
import type { SpinResult } from "../domain/tetris/SpinDetector";

const tSpin: SpinResult = {
  kind: "TSpin",
  grade: "Full",
  pieceType: "T",
  method: "TCorner",
  rotationState: "0",
  kickIndex: 0,
};

describe("ComboB2BTracker", () => {
  it("increments combo on line clears and resets on no clear", () => {
    const first = new ComboB2BTracker().next(createClearResult({ linesCleared: 1 }));
    const second = new ComboB2BTracker(first).next(createClearResult({ linesCleared: 2 }));
    const reset = new ComboB2BTracker(second).next(createClearResult({ linesCleared: 0 }));

    expect(first.comboCount).toBe(1);
    expect(first.comboDisplayCount).toBe(0);
    expect(first.isComboActive).toBe(false);
    expect(second.comboCount).toBe(2);
    expect(second.comboDisplayCount).toBe(1);
    expect(second.isComboActive).toBe(true);
    expect(reset.comboCount).toBe(0);
    expect(reset.isComboActive).toBe(false);
  });

  it("tracks Back-to-Back for repeated Tetrises", () => {
    const first = new ComboB2BTracker().next(createClearResult({ linesCleared: 4 }));
    const second = new ComboB2BTracker(first).next(createClearResult({ linesCleared: 4 }));

    expect(first.isBackToBack).toBe(true);
    expect(first.backToBackCount).toBe(1);
    expect(second.isBackToBack).toBe(true);
    expect(second.backToBackCount).toBe(2);
    expect(second.backToBackBroken).toBe(false);
  });

  it("tracks Back-to-Back for T-Spin line clears", () => {
    const result = new ComboB2BTracker().next(createClearResult({ linesCleared: 2, spinResult: tSpin }));

    expect(result.isBackToBack).toBe(true);
    expect(result.backToBackCount).toBe(1);
  });

  it("breaks Back-to-Back on ordinary Single, Double, or Triple", () => {
    const b2b = new ComboB2BTracker().next(createClearResult({ linesCleared: 4 }));
    const broken = new ComboB2BTracker(b2b).next(createClearResult({ linesCleared: 2 }));

    expect(broken.isBackToBack).toBe(false);
    expect(broken.backToBackCount).toBe(0);
    expect(broken.backToBackBroken).toBe(true);
  });

  it("can keep Back-to-Back through an empty T-Spin by rule config", () => {
    const b2b = new ComboB2BTracker().next(createClearResult({ linesCleared: 4 }));
    const kept = new ComboB2BTracker(b2b, { keepBackToBackOnEmptyTSpin: true }).next(createClearResult({ linesCleared: 0, spinResult: tSpin }));
    const notKept = new ComboB2BTracker(b2b, { keepBackToBackOnEmptyTSpin: false }).next(createClearResult({ linesCleared: 0, spinResult: tSpin }));

    expect(kept.isBackToBack).toBe(true);
    expect(kept.backToBackCount).toBe(1);
    expect(notKept.isBackToBack).toBe(false);
    expect(notKept.backToBackCount).toBe(0);
    expect(notKept.backToBackBroken).toBe(true);
  });
});
