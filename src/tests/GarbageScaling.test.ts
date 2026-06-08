import { describe, expect, it } from "vitest";
import {
  calculateEnemyGpm,
  calculateFloorPressure,
  calculateGarbageIntervalMs,
  calculateGarbageLinesPerAttack,
  createScaledGarbagePattern,
} from "../domain/combat/garbage/GarbageScaling";

describe("GarbageScaling", () => {
  it("makes floor 1 equal to 20% of the final floor pressure", () => {
    expect(calculateFloorPressure(1)).toBeCloseTo(0.2, 5);
  });

  it("makes floor 30 equal to each difficulty final GPM", () => {
    expect(calculateEnemyGpm(30, "easy")).toBeCloseTo(10, 5);
    expect(calculateEnemyGpm(30, "normal")).toBeCloseTo(22, 5);
    expect(calculateEnemyGpm(30, "hard")).toBeCloseTo(32, 5);
    expect(calculateEnemyGpm(30, "expert")).toBeCloseTo(44, 5);
    expect(calculateEnemyGpm(30, "master")).toBeCloseTo(56, 5);
  });

  it("calculates normal and hard floor 30 GPMs", () => {
    expect(calculateEnemyGpm(30, "normal")).toBeCloseTo(22, 5);
    expect(calculateEnemyGpm(30, "hard")).toBeCloseTo(32, 5);
  });

  it("uses three garbage lines per attack at 22 GPM", () => {
    expect(calculateGarbageLinesPerAttack(22)).toBe(3);
  });

  it("calculates interval as lines times 60000 divided by enemy GPM", () => {
    expect(calculateGarbageIntervalMs(22, 3)).toBeCloseTo((3 * 60000) / 22, 5);
  });

  it("makes floor 1 normal equal to 4.4 GPM", () => {
    expect(calculateEnemyGpm(1, "normal")).toBeCloseTo(4.4, 5);
  });

  it("creates a fixed interval garbage pattern", () => {
    expect(createScaledGarbagePattern(30, "normal")).toMatchObject({
      type: "fixedInterval",
      lines: 3,
      travelDelayMs: 4000,
    });
  });

  it("does not let initialDelayMs drop below 3000ms", () => {
    const pattern = createScaledGarbagePattern(30, "master", { initialDelayMsAdd: -10000 });

    expect(pattern.initialDelayMs).toBeGreaterThanOrEqual(3000);
  });

  it("does not let initialDelayMs exceed intervalMs", () => {
    const pattern = createScaledGarbagePattern(30, "master", { initialDelayMsAdd: 10000 });

    expect(pattern.initialDelayMs).toBeLessThanOrEqual(pattern.intervalMs);
  });

  it("clamps floors to the 1 through 30 range", () => {
    expect(calculateEnemyGpm(-10, "normal")).toBeCloseTo(calculateEnemyGpm(1, "normal"), 5);
    expect(calculateEnemyGpm(999, "normal")).toBeCloseTo(calculateEnemyGpm(30, "normal"), 5);
  });
});
