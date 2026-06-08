import { describe, expect, it } from "vitest";
import { balanceConfig } from "../data/balanceConfig";
import { difficultyDefinitions } from "../data/difficultyDefinitions";
import { calculateEnemyStats, sampleNormalStats } from "../domain/balance/enemyStatCalculator";

describe("enemy stat balance calculator", () => {
  it("defines the requested difficulty multipliers", () => {
    expect(difficultyDefinitions.easy).toMatchObject({ demandMultiplier: 0.3, hpMultiplier: 0.85 });
    expect(difficultyDefinitions.normal).toMatchObject({ demandMultiplier: 0.65, hpMultiplier: 1 });
    expect(difficultyDefinitions.hard).toMatchObject({ demandMultiplier: 1, hpMultiplier: 1.15 });
    expect(difficultyDefinitions.expert).toMatchObject({ demandMultiplier: 1.45, hpMultiplier: 1.25 });
    expect(difficultyDefinitions.master).toMatchObject({ demandMultiplier: 2.1, hpMultiplier: 1.4 });
  });

  it("calculates normal normal floors without touching live combat state", () => {
    const samples = sampleNormalStats([1, 10, 20, 30]);

    expect(samples.map((stats) => stats.floor)).toEqual([1, 10, 20, 30]);
    expect(samples[0]).toMatchObject({
      difficultyId: "normal",
      baseDemand: 0.55,
      gravityMs: 900,
      lockDelayMs: 500,
      cappedGpm: false,
    });
    expect(samples[3].enemyDemandToBaseRatio).toBeLessThanOrEqual(balanceConfig.enemyDemandToBaseRatioLimits.normal.max);
    expect(samples[3].enemyGpm).toBeLessThanOrEqual(balanceConfig.garbage.gpmCapsByDifficulty.normal.normal);
  });

  it("clamps out-of-range floors to the configured run bounds", () => {
    expect(calculateEnemyStats({ floor: -10 }).floor).toBe(1);
    expect(calculateEnemyStats({ floor: 999 }).floor).toBe(balanceConfig.floorScaling.maxFloor);
  });

  it("applies difficulty and enemy role multipliers", () => {
    const normal = calculateEnemyStats({ floor: 20, difficultyId: "normal", enemyRole: "normal" });
    const masterElite = calculateEnemyStats({ floor: 20, difficultyId: "master", enemyRole: "elite" });

    expect(masterElite.maxHp).toBeGreaterThan(normal.maxHp);
    expect(masterElite.enemyGpm).toBeGreaterThan(normal.enemyGpm);
    expect(masterElite.gravityMs).toBeLessThan(normal.gravityMs);
    expect(masterElite.restrictionPressure).toBeGreaterThan(0);
  });

  it("applies enemy trait effects to calculated stats", () => {
    const base = calculateEnemyStats({ floor: 20, difficultyId: "normal", enemyRole: "normal" });
    const tank = calculateEnemyStats({ floor: 20, difficultyId: "normal", enemyRole: "normal", traits: ["tank"] });
    const aggressive = calculateEnemyStats({ floor: 20, difficultyId: "normal", enemyRole: "normal", traits: ["aggressive"] });

    expect(tank.hpToBaseHpRatio).toBeLessThanOrEqual(balanceConfig.hpToBaseHpRatioLimits.normal.max);
    expect(tank.enemyGpm).toBeLessThan(base.enemyGpm);
    expect(aggressive.garbageLines).toBeGreaterThanOrEqual(base.garbageLines);
  });
});
