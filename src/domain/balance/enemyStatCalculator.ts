import { balanceConfig, type BalanceConfig } from "../../data/balanceConfig";
import { difficultyDefinitions } from "../../data/difficultyDefinitions";
import type { DifficultyDefinition, EnemyCalculatedStats, EnemyRole, EnemyStatCalculationInput } from "./balanceTypes";
import { applyEnemyTraitEffects } from "./enemyTraitModifiers";
import {
  calculateBaseDemand,
  calculateEnemyGpm,
  calculateFloorGravityMultiplier,
  calculateRelicPowerAvg,
  calculateTargetTimeSeconds,
  normalizeFloorProgress,
} from "./floorScaling";

export function calculateEnemyStats(
  input: EnemyStatCalculationInput,
  config: BalanceConfig = balanceConfig,
): EnemyCalculatedStats {
  const difficulty = difficultyDefinitions[input.difficultyId ?? "standard"];
  const enemyRole = input.enemyRole ?? "normal";
  const roleMultiplier = config.enemyRoleMultipliers[enemyRole];
  const floor = clampFloor(input.floor, config);
  const normalizedProgress = normalizeFloorProgress(floor, config);
  const baseDemand = calculateBaseDemand(floor, config);
  const rawEnemyDemand = baseDemand * difficulty.demandMultiplier * roleMultiplier;
  const enemyDemand = rawEnemyDemand;
  const targetTime = calculateTargetTimeSeconds(floor, config);
  const baseHp = (config.hp.hpScale * baseDemand * targetTime) / config.hp.targetTimeDivisor;
  const gravityMultiplier = calculateFloorGravityMultiplier(floor, config) * difficulty.gravityMultiplier;
  const enemyGpm = calculateEnemyGpm(floor, config) * difficulty.garbageMultiplier * roleMultiplier;
  const patternPressure = enemyGpm * difficulty.patternMultiplier;
  const restrictionPressure = calculateRestrictionPressure(baseDemand, difficulty, enemyRole, roleMultiplier, config);
  const garbageLines = calculateGarbageLines(patternPressure, config);

  const stats: EnemyCalculatedStats = {
    floor,
    normalizedProgress,
    difficultyId: difficulty.id,
    baseDemand: round(baseDemand, 3),
    enemyDemand: round(enemyDemand, 3),
    enemyDemandToBaseRatio: round(calculateRatio(enemyDemand, baseDemand), 3),
    maxHp: clampHp(Math.round((config.hp.hpScale * enemyDemand * targetTime * difficulty.hpMultiplier) / config.hp.targetTimeDivisor), config),
    hpToBaseHpRatio: 1,
    gravityMs: Math.max(config.gravity.minGravityMs, Math.round(config.gravity.baseGravityMs / gravityMultiplier)),
    softDropMs: Math.max(config.gravity.minSoftDropMs, Math.round(config.gravity.baseSoftDropMs / gravityMultiplier)),
    lockDelayMs: config.gravity.baseLockDelayMs,
    enemyGpm: round(enemyGpm, 3),
    uncappedEnemyGpm: round(enemyGpm, 3),
    cappedGpm: false,
    intentEveryActions: calculateIntentEveryActions(enemyGpm, garbageLines, config),
    garbageLines,
    garbageDelayActions: config.garbage.defaultGarbageDelayActions,
    patternPressure: round(patternPressure, 3),
    restrictionPressure: round(restrictionPressure, 3),
  };

  return finalizeStats(applyEnemyTraitEffects(stats, input.traits ?? [], config), enemyRole, difficulty, baseHp, config);
}

export function sampleStandardNormalStats(floors = [1, 10, 20, 30]): EnemyCalculatedStats[] {
  return floors.map((floor) => calculateEnemyStats({ floor, difficultyId: "standard", enemyRole: "normal" }));
}

function calculateGarbageLines(patternPressure: number, config: BalanceConfig): number {
  const rawLines = Math.max(config.garbage.minGarbageLines, Math.round(patternPressure / config.garbage.garbageLinesPressureDivisor));
  return Math.min(config.garbage.maxGarbageLines, rawLines);
}

function calculateIntentEveryActions(enemyGpm: number, garbageLines: number, config: BalanceConfig): number {
  if (enemyGpm <= 0) return config.garbage.minIntentEveryActions;
  const actions = Math.round((garbageLines * config.garbage.baseGpmToIntentConversion) / enemyGpm);
  return Math.min(config.garbage.maxIntentEveryActions, Math.max(config.garbage.minIntentEveryActions, actions));
}

function finalizeStats(
  stats: EnemyCalculatedStats,
  enemyRole: EnemyRole,
  difficulty: DifficultyDefinition,
  baseHp: number,
  config: BalanceConfig,
): EnemyCalculatedStats {
  const hpLimits = config.hpToBaseHpRatioLimits[enemyRole];
  const maxHp = clampHp(Math.round(clampRoleRatio(stats.maxHp, baseHp, hpLimits, difficulty.id !== "explorer")), config);
  const gpmCap = getGpmCap(difficulty.id, enemyRole, config);
  const uncappedEnemyGpm = stats.uncappedEnemyGpm;
  const enemyGpm = round(Math.min(uncappedEnemyGpm, gpmCap), 3);
  const patternPressure = round(Math.min(stats.patternPressure, gpmCap * difficulty.patternMultiplier), 3);
  const garbageLines = calculateGarbageLines(patternPressure, config);

  return {
    ...stats,
    maxHp,
    hpToBaseHpRatio: round(calculateRatio(maxHp, baseHp), 3),
    enemyGpm,
    uncappedEnemyGpm: round(uncappedEnemyGpm, 3),
    cappedGpm: uncappedEnemyGpm > gpmCap,
    intentEveryActions: calculateIntentEveryActions(enemyGpm, garbageLines, config),
    garbageLines,
    patternPressure,
  };
}

function getGpmCap(difficultyId: DifficultyDefinition["id"], enemyRole: EnemyRole, config: BalanceConfig): number {
  const cap = config.garbage.gpmCapsByDifficulty[difficultyId] ?? config.garbage.gpmCapsByDifficulty.standard;
  return isBossLikeRole(enemyRole) ? cap.boss : cap.normal;
}

function isBossLikeRole(enemyRole: EnemyRole): boolean {
  return enemyRole === "miniboss" || enemyRole === "boss" || enemyRole === "finalBoss";
}

function clampRoleRatio(
  value: number,
  baseValue: number,
  limits: { min: number; max: number },
  applyMin: boolean,
): number {
  if (!Number.isFinite(value) || !Number.isFinite(baseValue) || baseValue <= 0) return value;
  const maxValue = baseValue * limits.max;
  const minValue = applyMin ? baseValue * limits.min : 0;
  return Math.min(maxValue, Math.max(minValue, value));
}

function calculateRatio(value: number, baseValue: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(baseValue) || baseValue <= 0) return 0;
  return value / baseValue;
}

function calculateRestrictionPressure(
  baseDemand: number,
  difficulty: DifficultyDefinition,
  enemyRole: EnemyRole,
  roleMultiplier: number,
  config: BalanceConfig,
): number {
  if (enemyRole === "normal") return 0;
  return baseDemand * (roleMultiplier - 1) * difficulty.patternMultiplier * config.pressureWeights.restrictionPressureScale;
}

function clampFloor(floor: number, config: BalanceConfig): number {
  if (!Number.isFinite(floor)) return 1;
  return Math.min(config.floorScaling.maxFloor, Math.max(1, Math.round(floor)));
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
