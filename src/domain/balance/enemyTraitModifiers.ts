import { balanceConfig, type BalanceConfig } from "../../data/balanceConfig";
import { enemyTraitEffects } from "../../data/enemyTraitEffects";
import type { EnemyCalculatedStats } from "./balanceTypes";
import type { EnemyTraitEffect, EnemyTraitId } from "../enemy/EnemyTrait";

export function applyEnemyTraitEffects(
  stats: EnemyCalculatedStats,
  traits: EnemyTraitId[] = [],
  config: BalanceConfig = balanceConfig,
  effects: Record<EnemyTraitId, EnemyTraitEffect> = enemyTraitEffects,
): EnemyCalculatedStats {
  if (traits.length === 0) return stats;

  const aggregate = traits.reduce(
    (result, traitId) => {
      const effect = effects[traitId];
      return {
        hpMultiplier: result.hpMultiplier * (effect.hpMultiplier ?? 1),
        gravityMultiplier: result.gravityMultiplier * (effect.gravityMultiplier ?? 1),
        garbageMultiplier: result.garbageMultiplier * (effect.garbageMultiplier ?? 1),
        patternMultiplier: result.patternMultiplier * (effect.patternMultiplier ?? 1),
        intentEveryActionsMultiplier: result.intentEveryActionsMultiplier * (effect.intentEveryActionsMultiplier ?? 1),
        intentEveryActionsAdd: result.intentEveryActionsAdd + (effect.intentEveryActionsAdd ?? 0),
        patternPressureAdd: result.patternPressureAdd + (effect.patternPressureAdd ?? 0),
        restrictionPressureAdd: result.restrictionPressureAdd + (effect.restrictionPressureAdd ?? 0),
      };
    },
    {
      hpMultiplier: 1,
      gravityMultiplier: 1,
      garbageMultiplier: 1,
      patternMultiplier: 1,
      intentEveryActionsMultiplier: 1,
      intentEveryActionsAdd: 0,
      patternPressureAdd: 0,
      restrictionPressureAdd: 0,
    },
  );

  const uncappedEnemyGpm = round(stats.uncappedEnemyGpm * aggregate.garbageMultiplier, 3);
  const enemyGpm = round(stats.enemyGpm * aggregate.garbageMultiplier, 3);
  const patternPressure = round(stats.patternPressure * aggregate.patternMultiplier + aggregate.patternPressureAdd, 3);
  const restrictionPressure = round(stats.restrictionPressure + aggregate.restrictionPressureAdd, 3);
  const garbageLines = calculateGarbageLines(patternPressure, config);

  return {
    ...stats,
    maxHp: clampHp(Math.round(stats.maxHp * aggregate.hpMultiplier), config),
    gravityMs: Math.max(config.gravity.minGravityMs, Math.round(stats.gravityMs / aggregate.gravityMultiplier)),
    softDropMs: Math.max(config.gravity.minSoftDropMs, Math.round(stats.softDropMs / aggregate.gravityMultiplier)),
    enemyGpm,
    uncappedEnemyGpm,
    cappedGpm: false,
    intentEveryActions: calculateModifiedIntentEveryActions(stats.intentEveryActions, aggregate.intentEveryActionsMultiplier, aggregate.intentEveryActionsAdd, config),
    garbageLines,
    patternPressure,
    restrictionPressure,
  };
}

function calculateGarbageLines(patternPressure: number, config: BalanceConfig): number {
  const rawLines = Math.max(config.garbage.minGarbageLines, Math.round(patternPressure / config.garbage.garbageLinesPressureDivisor));
  return Math.min(config.garbage.maxGarbageLines, rawLines);
}

function calculateModifiedIntentEveryActions(
  intentEveryActions: number,
  multiplier: number,
  add: number,
  config: BalanceConfig,
): number {
  const actions = Math.round(intentEveryActions * multiplier + add);
  return Math.min(config.garbage.maxIntentEveryActions, Math.max(config.garbage.minIntentEveryActions, actions));
}

function clampHp(value: number, config: BalanceConfig): number {
  const minHp = config.hp.minHp;
  const maxHp = config.hp.maxHp;
  const clampedMin = Math.max(minHp, value);
  return typeof maxHp === "number" ? Math.min(maxHp, clampedMin) : clampedMin;
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
