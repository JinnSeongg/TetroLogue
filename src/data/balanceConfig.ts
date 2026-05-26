import type { EnemyRole } from "../domain/balance/balanceTypes";
import type { EnemyTraitEffect, EnemyTraitId } from "../domain/enemy/EnemyTrait";

export type BalanceConfig = {
  floorScaling: {
    maxFloor: number;
    baseDemandStart: number;
    baseDemandGrowth: number;
    baseDemandExponent: number;
    relicAvgStart: number;
    relicAvgGrowth: number;
    relicAvgExponent: number;
    gravityStart: number;
    gravityGrowth: number;
    gravityExponent: number;
    gpmStart: number;
    gpmGrowth: number;
    gpmExponent: number;
    targetTimeStart: number;
    targetTimeGrowth: number;
  };
  hp: {
    hpScale: number;
    minHp: number;
    maxHp?: number;
    targetTimeDivisor: number;
  };
  gravity: {
    baseGravityMs: number;
    minGravityMs: number;
    baseSoftDropMs: number;
    minSoftDropMs: number;
    baseLockDelayMs: number;
  };
  garbage: {
    minIntentEveryActions: number;
    maxIntentEveryActions: number;
    defaultGarbageDelayActions: number;
    baseGpmToIntentConversion: number;
    minGarbageLines: number;
    maxGarbageLines: number;
    garbageLinesPressureDivisor: number;
    gpmCapsByDifficulty: Record<
      string,
      {
        normal: number;
        boss: number;
      }
    >;
  };
  pressureWeights: {
    gravityWeightByPhase: readonly number[];
    garbageWeightByPhase: readonly number[];
    restrictionPressureScale: number;
  };
  enemyRoleMultipliers: Record<EnemyRole, number>;
  enemyDemandToBaseRatioLimits: Record<EnemyRole, { min: number; max: number }>;
  hpToBaseHpRatioLimits: Record<EnemyRole, { min: number; max: number }>;
  enemyTraitModifiers: Record<EnemyTraitId, EnemyTraitEffect>;
};

export const balanceConfig = {
  floorScaling: {
    maxFloor: 30,
    baseDemandStart: 0.55,
    baseDemandGrowth: 3.65,
    baseDemandExponent: 1.5,
    relicAvgStart: 1,
    relicAvgGrowth: 2.0,
    relicAvgExponent: 1.35,
    gravityStart: 1,
    gravityGrowth: 0.85,
    gravityExponent: 1.3,
    gpmStart: 0.5,
    gpmGrowth: 5.5,
    gpmExponent: 1.7,
    targetTimeStart: 50,
    targetTimeGrowth: 45,
  },
  hp: {
    hpScale: 100,
    minHp: 1,
    maxHp: undefined,
    targetTimeDivisor: 60,
  },
  gravity: {
    baseGravityMs: 900,
    minGravityMs: 120,
    baseSoftDropMs: 100,
    minSoftDropMs: 35,
    baseLockDelayMs: 500,
  },
  garbage: {
    minIntentEveryActions: 3,
    maxIntentEveryActions: 60,
    defaultGarbageDelayActions: 2,
    baseGpmToIntentConversion: 24,
    minGarbageLines: 1,
    maxGarbageLines: 8,
    garbageLinesPressureDivisor: 3.25,
    gpmCapsByDifficulty: {
      explorer: { normal: 4, boss: 6 },
      standard: { normal: 8, boss: 12 },
      advanced: { normal: 12, boss: 16 },
      master: { normal: 16, boss: 22 },
      void: { normal: 24, boss: 32 },
    },
  },
  pressureWeights: {
    gravityWeightByPhase: [1, 1.15, 1.3],
    garbageWeightByPhase: [1, 1.2, 1.45],
    restrictionPressureScale: 0.35,
  },
  enemyRoleMultipliers: {
    normal: 1,
    dangerous: 1.15,
    elite: 1.3,
    miniboss: 1.15,
    boss: 1.3,
    finalBoss: 1.5,
  },
  enemyDemandToBaseRatioLimits: {
    normal: { min: 1, max: 1.8 },
    dangerous: { min: 1.2, max: 2.2 },
    elite: { min: 1.8, max: 2.8 },
    miniboss: { min: 1.8, max: 3.1 },
    boss: { min: 2, max: 3.5 },
    finalBoss: { min: 2.4, max: 4.2 },
  },
  hpToBaseHpRatioLimits: {
    normal: { min: 0.75, max: 1 },
    dangerous: { min: 0.9, max: 1.25 },
    elite: { min: 1.3, max: 1.6 },
    miniboss: { min: 1.6, max: 2.2 },
    boss: { min: 1.6, max: 1.8 },
    finalBoss: { min: 2, max: 2.2 },
  },
  enemyTraitModifiers: {
    garbage_light: {
      id: "garbage_light",
      description: "Slightly increases garbage pressure.",
      garbageMultiplier: 1.1,
    },
    garbage_heavy: {
      id: "garbage_heavy",
      description: "Greatly increases garbage pressure and acts more often.",
      garbageMultiplier: 1.35,
      intentEveryActionsMultiplier: 0.9,
    },
    garbage_wave: {
      id: "garbage_wave",
      description: "Marks the enemy as preferring bursty wave pressure.",
      patternMultiplier: 1.1,
      tags: ["wave"],
    },
    gravity_pressure: {
      id: "gravity_pressure",
      description: "Raises gravity pressure.",
      gravityMultiplier: 1.2,
    },
    tank: {
      id: "tank",
      description: "Higher HP with slightly lower garbage pressure.",
      hpMultiplier: 1.25,
      garbageMultiplier: 0.9,
    },
    fragile: {
      id: "fragile",
      description: "Lower HP with slightly sharper pattern pressure.",
      hpMultiplier: 0.8,
      patternMultiplier: 1.1,
    },
    aggressive: {
      id: "aggressive",
      description: "Acts faster but gives up a little HP.",
      hpMultiplier: 0.95,
      intentEveryActionsMultiplier: 0.85,
    },
    slow: {
      id: "slow",
      description: "Acts slower and gains a little HP.",
      hpMultiplier: 1.1,
      intentEveryActionsMultiplier: 1.15,
    },
    boss_phase: {
      id: "boss_phase",
      description: "Adds phase-based pattern pressure.",
      patternMultiplier: 1.15,
      patternPressureAdd: 0.5,
    },
    final_boss: {
      id: "final_boss",
      description: "Raises overall pressure for final boss encounters.",
      hpMultiplier: 1.2,
      garbageMultiplier: 1.15,
      gravityMultiplier: 1.1,
      patternMultiplier: 1.2,
      restrictionPressureAdd: 0.5,
    },
  },
} satisfies BalanceConfig;
