import { describe, expect, it } from "vitest";
import { createDefaultCombatFeedbackEvent } from "../domain/combat/CombatFeedbackEvent";
import { getAttackAnimationVariant } from "../presentation/components/AttackAnimationController";

describe("AttackAnimationController", () => {
  it("selects variants from CombatFeedbackEvent without recalculating damage", () => {
    const base = { ...createDefaultCombatFeedbackEvent(), attackAmount: 4, intensity: "high" as const };

    expect(getAttackAnimationVariant({ ...base, clearName: "Single" })).toBe("basic");
    expect(getAttackAnimationVariant({ ...base, clearName: "Tetris" })).toBe("tetris");
    expect(getAttackAnimationVariant({ ...base, clearName: "T-Spin Double" })).toBe("tSpin");
    expect(getAttackAnimationVariant({ ...base, clearName: "Tetris", isBackToBack: true })).toBe("backToBack");
    expect(getAttackAnimationVariant({ ...base, clearName: "Perfect Clear", isPerfectClear: true })).toBe("perfectClear");
  });
});
