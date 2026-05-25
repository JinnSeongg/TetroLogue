import { describe, expect, it } from "vitest";
import { createDefaultCombatFeedbackEvent } from "../domain/combat/CombatFeedbackEvent";
import { ScreenShakeService } from "../presentation/services/ScreenShakeService";

describe("ScreenShakeService", () => {
  it("does not shake for none or low intensity", () => {
    const service = new ScreenShakeService();

    expect(service.configFor({ ...createDefaultCombatFeedbackEvent(), intensity: "none" })).toBeUndefined();
    expect(service.configFor({ ...createDefaultCombatFeedbackEvent(), intensity: "low" })).toBeUndefined();
  });

  it("returns progressively stronger default configs for medium, high, and critical", () => {
    const service = new ScreenShakeService();
    const medium = service.configFor({ ...createDefaultCombatFeedbackEvent(), intensity: "medium" });
    const high = service.configFor({ ...createDefaultCombatFeedbackEvent(), intensity: "high" });
    const critical = service.configFor({ ...createDefaultCombatFeedbackEvent(), intensity: "critical" });

    expect(medium?.strengthPx).toBeLessThan(high?.strengthPx ?? 0);
    expect(high?.strengthPx).toBeLessThan(critical?.strengthPx ?? 0);
    expect(critical?.durationMs).toBeGreaterThan(high?.durationMs ?? 0);
  });

  it("clamps excessive custom configs", () => {
    const service = new ScreenShakeService({
      medium: { durationMs: 999, strengthPx: 99, frequencyHz: 99, decay: 9 },
      high: { durationMs: 999, strengthPx: 99, frequencyHz: 99, decay: 9 },
      critical: { durationMs: 999, strengthPx: 99, frequencyHz: 99, decay: 9 },
    });
    const config = service.configFor({ ...createDefaultCombatFeedbackEvent(), intensity: "critical" });

    expect(config).toEqual({ durationMs: 360, strengthPx: 8, frequencyHz: 34, decay: 1 });
  });

  it("decays frame amplitude to zero after duration", () => {
    const service = new ScreenShakeService();
    const config = service.configFor({ ...createDefaultCombatFeedbackEvent(), intensity: "high" });
    if (!config) throw new Error("Expected config");

    expect(service.frameAt(config.durationMs + 1, config)).toEqual({ x: 0, y: 0, rotationDeg: 0 });
  });
});
