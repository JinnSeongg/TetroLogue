import { describe, expect, it } from "vitest";
import { relicDefinitions } from "../data/relicDefinitions";
import { EffectResolver } from "../domain/relic/EffectResolver";
import { standardRuleSet, type TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";

describe("Relic rule set modifiers", () => {
  it("keeps values identical when no relics are owned", () => {
    const baseRuleSet = createBaseRuleSet();
    const result = new EffectResolver().resolveEffectiveRuleSet(baseRuleSet, []);

    expect(result).toEqual(baseRuleSet);
    expect(result).not.toBe(baseRuleSet);
  });

  it("applies gentle_fall as a 1.2x gravity interval multiplier", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.gentle_fall]);

    expect(result.gravityMs).toBe(1080);
  });

  it("applies delayed_lock as +150ms lock delay", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.delayed_lock]);

    expect(result.lockDelayMs).toBe(650);
  });

  it("applies compressed_preview and clamps next preview count to at least 1", () => {
    const normal = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.compressed_preview]);
    const clamped = new EffectResolver().resolveEffectiveRuleSet({ ...createBaseRuleSet(), nextPreviewCount: 2 }, [relicDefinitions.compressed_preview]);

    expect(normal.nextPreviewCount).toBe(3);
    expect(clamped.nextPreviewCount).toBe(1);
  });

  it("applies no_hold_focus as a hold disable override", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(createBaseRuleSet(), [relicDefinitions.no_hold_focus]);

    expect(result.holdEnabled).toBe(false);
  });

  it("does not mutate the base rule set", () => {
    const baseRuleSet = createBaseRuleSet();
    const before = { ...baseRuleSet };

    const result = new EffectResolver().resolveEffectiveRuleSet(baseRuleSet, [
      relicDefinitions.gentle_fall,
      relicDefinitions.delayed_lock,
      relicDefinitions.compressed_preview,
      relicDefinitions.no_hold_focus,
    ]);

    expect(baseRuleSet).toEqual(before);
    expect(result).not.toEqual(baseRuleSet);
  });

  it("reports applied rule relic ids when details are requested", () => {
    const result = new EffectResolver().resolveEffectiveRuleSet(
      createBaseRuleSet(),
      [relicDefinitions.gentle_fall, relicDefinitions.no_hold_focus],
      { includeDetails: true },
    );

    expect(result.appliedRuleRelicIds).toEqual(["gentle_fall", "no_hold_focus"]);
    expect(result.baseRuleSet).toEqual(createBaseRuleSet());
  });
});

function createBaseRuleSet(): TetrisRuleSet {
  return { ...standardRuleSet };
}
