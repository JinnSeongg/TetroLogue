import { describe, expect, it } from "vitest";
import { calculateEnemyStats } from "../domain/balance/enemyStatCalculator";
import { createScaledRuleSet } from "../domain/balance/ruleSetScaler";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";

describe("RuleSet scaler", () => {
  it("creates a combat rule set without mutating the standard rule set", () => {
    const stats = calculateEnemyStats({ floor: 20, difficultyId: "standard", enemyRole: "normal", traits: [] });

    const scaled = createScaledRuleSet(standardRuleSet, stats);

    expect(scaled).not.toBe(standardRuleSet);
    expect(scaled.gravityMs).toBe(stats.gravityMs);
    expect(scaled.softDropGravityMs).toBe(standardRuleSet.softDropGravityMs);
    expect(scaled.lockDelayMs).toBe(standardRuleSet.lockDelayMs);
    expect(standardRuleSet.gravityMs).toBe(900);
  });

  it("clamps combat gravity to the allowed range", () => {
    const veryFastStats = {
      ...calculateEnemyStats({ floor: 30, difficultyId: "void", enemyRole: "finalBoss", traits: ["final_boss"] }),
      gravityMs: 1,
    };

    expect(createScaledRuleSet(standardRuleSet, veryFastStats).gravityMs).toBe(120);
  });
});
