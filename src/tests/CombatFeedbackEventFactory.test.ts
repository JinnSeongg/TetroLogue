import { describe, expect, it } from "vitest";
import { CombatFeedbackEventFactory } from "../domain/combat/CombatFeedbackEventFactory";
import type { ComboB2BResult } from "../domain/combat/ComboB2BTracker";
import { createBaseAttackResult } from "../domain/combat/attack/AttackResultFactory";
import { createClearResult } from "../domain/tetris/ClearResult";
import type { SpinResult } from "../domain/tetris/SpinDetector";

const comboB2BResult: ComboB2BResult = {
  comboCount: 3,
  comboDisplayCount: 2,
  isComboActive: true,
  isBackToBack: true,
  backToBackCount: 2,
  backToBackBroken: false,
};

const tSpin: SpinResult = {
  kind: "TSpin",
  grade: "Full",
  pieceType: "T",
  method: "TCorner",
  rotationState: "0",
  kickIndex: 0,
};

describe("CombatFeedbackEventFactory", () => {
  it("creates a safe default event when inputs are missing", () => {
    const event = new CombatFeedbackEventFactory().create({});

    expect(event.eventId).toMatch(/^combat-feedback-\d+$/);
    expect(event.sequenceId).toBeGreaterThan(0);
    expect(event.clearName).toBe("None");
    expect(event.attackAmount).toBe(0);
    expect(event.dangerLevel).toBe("Safe");
    expect(event.intensity).toBe("none");
  });

  it("maps clear results, attack, offset, combo, b2b, and danger state into one event", () => {
    const clearResult = createClearResult({ linesCleared: 4 });
    const attackResult = createBaseAttackResult({ lineClearCount: 4, baseDamage: 4 });
    const event = new CombatFeedbackEventFactory().create({
      clearResult,
      attackResult,
      comboB2BResult,
      dangerState: { dangerLevel: "Warning" },
      offsetAmount: 2,
    });

    expect(event).toMatchObject({
      clearName: "Tetris",
      clearedLines: 4,
      attackAmount: 4,
      offsetAmount: 2,
      comboCount: 3,
      isComboActive: true,
      isBackToBack: true,
      backToBackCount: 2,
      isPerfectClear: false,
      dangerLevel: "Warning",
      intensity: "high",
    });
  });

  it.each([
    [1, "low"],
    [2, "low"],
    [3, "medium"],
    [4, "high"],
  ] as const)("maps %i line clears to %s intensity", (linesCleared, intensity) => {
    const event = new CombatFeedbackEventFactory().create({ clearResult: createClearResult({ linesCleared }) });

    expect(event.intensity).toBe(intensity);
  });

  it("maps T-Spin Double or better to high intensity", () => {
    const event = new CombatFeedbackEventFactory().create({ clearResult: createClearResult({ linesCleared: 2, spinResult: tSpin }) });

    expect(event.clearName).toBe("T-Spin Double");
    expect(event.intensity).toBe("high");
  });

  it("maps Perfect Clear to critical intensity", () => {
    const event = new CombatFeedbackEventFactory().create({ clearResult: createClearResult({ linesCleared: 4, isPerfectClear: true }) });

    expect(event.clearName).toBe("Perfect Clear");
    expect(event.intensity).toBe("critical");
  });
});
