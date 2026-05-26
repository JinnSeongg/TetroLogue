import { balanceConfig } from "../../data/balanceConfig";
import type { EnemyCalculatedStats } from "./balanceTypes";
import type { TetrisRuleSet } from "../tetris/TetrisRuleSet";

export function createScaledRuleSet(baseRuleSet: TetrisRuleSet, calculatedStats: EnemyCalculatedStats): TetrisRuleSet {
  return {
    ...baseRuleSet,
    gravityMs: clamp(Math.round(calculatedStats.gravityMs), balanceConfig.gravity.minGravityMs, baseRuleSet.gravityMs),
    softDropGravityMs: baseRuleSet.softDropGravityMs,
    lockDelayMs: baseRuleSet.lockDelayMs,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
