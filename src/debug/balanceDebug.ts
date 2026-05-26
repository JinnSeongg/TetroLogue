import { balanceConfig } from "../data/balanceConfig";
import { difficultyDefinitions } from "../data/difficultyDefinitions";
import { enemyTraitEffects } from "../data/enemyTraitEffects";
import { selectEnemyForFloor } from "../data/enemySelector";
import { calculateEnemyStats } from "../domain/balance/enemyStatCalculator";
import { calculateEnemyGpm, calculateFloorGravityMultiplier, calculateRelicPowerAvg, calculateTargetTimeSeconds } from "../domain/balance/floorScaling";
import type { DifficultyId } from "../domain/balance/balanceTypes";
import type { EnemyTraitEffect, EnemyTraitId } from "../domain/enemy/EnemyTrait";
import { safeNumber, safeRatio, safeText } from "./balanceDebugGuards";

export type BalancePreviewRow = {
  floor: number;
  difficulty: DifficultyId;
  selectedEnemyId: string;
  selectedEnemyName: string;
  role: string;
  traits: string;
  baseDemand: number;
  difficultyMultiplier: number;
  roleMultiplier: number;
  traitDemandMultiplier: number;
  rawEnemyDemand: number;
  enemyDemandClampMax: number;
  enemyDemand: number;
  enemyDemandToBaseRatio: number;
  gravityPressure: number;
  garbagePressure: number;
  patternPressure: number;
  restrictionPressure: number;
  traitDemandBreakdown: string;
  traitPressureBreakdown: string;
  maxHp: number;
  hpToBaseHpRatio: number;
  gravityMs: number;
  enemyGpm: number;
  cappedGpm: boolean;
  uncappedEnemyGpm: number;
  intentEveryActions: number;
  garbageLines: number;
  targetTime: number;
  relicAvgPower: number;
  difficultyRatioD: number;
  difficultyRatioC: number;
  difficultyRatioB: number;
  difficultyRatioA: number;
  difficultyRatioS: number;
  difficultyRatioSS: number;
  difficultyRatioU: number;
  difficultyRatioX: number;
  ratioDAvgRelic: number;
  ratioCAvgRelic: number;
  ratioBAvgRelic: number;
  ratioAAvgRelic: number;
  ratioSAvgRelic: number;
  ratioSSAvgRelic: number;
  ratioUAvgRelic: number;
  ratioXAvgRelic: number;
  estimatedTimeB: number;
  estimatedTimeA: number;
  estimatedTimeS: number;
  estimatedTimeSS: number;
};

export type BalancePreview = {
  difficultyId: DifficultyId;
  rows: BalancePreviewRow[];
};

export type BalanceDebugApi = {
  generateBalancePreview: typeof generateBalancePreview;
  getBalancePreviewRows: typeof getBalancePreviewRows;
  logBalancePreview: typeof logBalancePreview;
};

declare global {
  interface Window {
    __balanceDebug?: BalanceDebugApi;
    generateBalancePreview?: typeof generateBalancePreview;
    getBalancePreviewRows?: typeof getBalancePreviewRows;
    logBalancePreview?: typeof logBalancePreview;
  }
}

const skillPower = {
  D: 0.4,
  C: 0.6,
  B: 1,
  A: 1.4,
  S: 2.2,
  SS: 3.5,
  U: 5,
  X: 7,
} as const;

export function generateBalancePreview(difficultyId: DifficultyId = "standard"): BalancePreview {
  const safeDifficultyId = normalizeDifficultyId(difficultyId);
  return {
    difficultyId: safeDifficultyId,
    rows: getBalancePreviewRows(safeDifficultyId),
  };
}

export function getBalancePreviewRows(difficultyId: DifficultyId = "standard"): BalancePreviewRow[] {
  const safeDifficultyId = normalizeDifficultyId(difficultyId);
  const rng = createDeterministicRng(20260525);
  const recentEnemyIds: string[] = [];

  return Array.from({ length: balanceConfig.floorScaling.maxFloor }, (_, index) => {
    const floor = index + 1;
    const enemy = selectEnemyForFloor(floor, safeDifficultyId, rng, recentEnemyIds);
    recentEnemyIds.push(enemy.id);
    const difficulty = difficultyDefinitions[safeDifficultyId];
    const roleMultiplier = safeNumber(balanceConfig.enemyRoleMultipliers[enemy.role], 1, 0);
    const stats = calculateEnemyStats({
      floor,
      difficultyId: safeDifficultyId,
      enemyRole: enemy.role,
      traits: enemy.traits,
    });
    const enemyDemand = safeNumber(stats.enemyDemand, 1, 0);
    const relicPowerAvg = safeNumber(calculateRelicPowerAvg(floor), 1, 0.1);
    const traitAggregate = aggregateTraitEffects(enemy.traits);
    const rawEnemyDemand = stats.baseDemand * difficulty.demandMultiplier * roleMultiplier;
    const enemyDemandClampMax = stats.baseDemand * balanceConfig.enemyDemandToBaseRatioLimits[enemy.role].max;
    const gravityPressure = calculateFloorGravityMultiplier(floor) * difficulty.gravityMultiplier * traitAggregate.gravityMultiplier;
    const garbagePressure = calculateEnemyGpm(floor) * difficulty.garbageMultiplier * roleMultiplier * traitAggregate.garbageMultiplier;

    return {
      floor,
      difficulty: safeDifficultyId,
      selectedEnemyId: safeText(enemy.id),
      selectedEnemyName: safeText(enemy.name),
      role: safeText(enemy.role),
      traits: enemy.traits.map((trait) => safeText(trait)).join(", "),
      baseDemand: round(safeNumber(stats.baseDemand, 0.1, 0), 3),
      difficultyMultiplier: round(safeNumber(difficulty.demandMultiplier, 1, 0), 3),
      roleMultiplier: round(roleMultiplier, 3),
      traitDemandMultiplier: 1,
      rawEnemyDemand: round(safeNumber(rawEnemyDemand, 1, 0), 3),
      enemyDemandClampMax: round(safeNumber(enemyDemandClampMax, 1, 0), 3),
      enemyDemand: round(enemyDemand, 3),
      enemyDemandToBaseRatio: round(safeRatio(stats.enemyDemandToBaseRatio), 3),
      gravityPressure: round(safeNumber(gravityPressure, 1, 0), 3),
      garbagePressure: round(safeNumber(garbagePressure, 0.1, 0), 3),
      patternPressure: round(safeNumber(stats.patternPressure, 0.1, 0), 3),
      restrictionPressure: round(safeNumber(stats.restrictionPressure, 0, 0), 3),
      traitDemandBreakdown: enemy.traits.length > 0 ? enemy.traits.map((trait) => `${trait}:demandx1`).join(", ") : "-",
      traitPressureBreakdown: formatTraitPressureBreakdown(enemy.traits),
      maxHp: Math.round(safeNumber(stats.maxHp, 1, 0)),
      hpToBaseHpRatio: round(safeRatio(stats.hpToBaseHpRatio), 3),
      gravityMs: Math.round(safeNumber(stats.gravityMs, balanceConfig.gravity.baseGravityMs, 0)),
      enemyGpm: round(safeNumber(stats.enemyGpm, 0.1, 0), 3),
      cappedGpm: stats.cappedGpm,
      uncappedEnemyGpm: round(safeNumber(stats.uncappedEnemyGpm, stats.enemyGpm, 0), 3),
      intentEveryActions: Math.round(safeNumber(stats.intentEveryActions, balanceConfig.garbage.minIntentEveryActions, 0)),
      garbageLines: Math.round(safeNumber(stats.garbageLines, balanceConfig.garbage.minGarbageLines, 0)),
      targetTime: round(safeNumber(calculateTargetTimeSeconds(floor), 1, 0), 1),
      relicAvgPower: round(relicPowerAvg, 3),
      difficultyRatioD: calculateDifficultyRatio(enemyDemand, skillPower.D),
      difficultyRatioC: calculateDifficultyRatio(enemyDemand, skillPower.C),
      difficultyRatioB: calculateDifficultyRatio(enemyDemand, skillPower.B),
      difficultyRatioA: calculateDifficultyRatio(enemyDemand, skillPower.A),
      difficultyRatioS: calculateDifficultyRatio(enemyDemand, skillPower.S),
      difficultyRatioSS: calculateDifficultyRatio(enemyDemand, skillPower.SS),
      difficultyRatioU: calculateDifficultyRatio(enemyDemand, skillPower.U),
      difficultyRatioX: calculateDifficultyRatio(enemyDemand, skillPower.X),
      ratioDAvgRelic: calculateAvgRelicRatio(enemyDemand, skillPower.D, relicPowerAvg),
      ratioCAvgRelic: calculateAvgRelicRatio(enemyDemand, skillPower.C, relicPowerAvg),
      ratioBAvgRelic: calculateAvgRelicRatio(enemyDemand, skillPower.B, relicPowerAvg),
      ratioAAvgRelic: calculateAvgRelicRatio(enemyDemand, skillPower.A, relicPowerAvg),
      ratioSAvgRelic: calculateAvgRelicRatio(enemyDemand, skillPower.S, relicPowerAvg),
      ratioSSAvgRelic: calculateAvgRelicRatio(enemyDemand, skillPower.SS, relicPowerAvg),
      ratioUAvgRelic: calculateAvgRelicRatio(enemyDemand, skillPower.U, relicPowerAvg),
      ratioXAvgRelic: calculateAvgRelicRatio(enemyDemand, skillPower.X, relicPowerAvg),
      estimatedTimeB: calculateEstimatedTime(stats.maxHp, skillPower.B, relicPowerAvg),
      estimatedTimeA: calculateEstimatedTime(stats.maxHp, skillPower.A, relicPowerAvg),
      estimatedTimeS: calculateEstimatedTime(stats.maxHp, skillPower.S, relicPowerAvg),
      estimatedTimeSS: calculateEstimatedTime(stats.maxHp, skillPower.SS, relicPowerAvg),
    };
  });
}

export function logBalancePreview(difficultyId: DifficultyId = "standard"): BalancePreviewRow[] {
  const rows = getBalancePreviewRows(difficultyId);
  console.table(rows);
  return rows;
}

export function registerBalanceDebugGlobals(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (!enabled) {
    delete window.__balanceDebug;
    delete window.generateBalancePreview;
    delete window.getBalancePreviewRows;
    delete window.logBalancePreview;
    return;
  }
  window.__balanceDebug = {
    generateBalancePreview,
    getBalancePreviewRows,
    logBalancePreview,
  };
  window.generateBalancePreview = generateBalancePreview;
  window.getBalancePreviewRows = getBalancePreviewRows;
  window.logBalancePreview = logBalancePreview;
}

export function balanceRowsToTsv(rows: BalancePreviewRow[]): string {
  const headers = Object.keys(rows[0] ?? {}) as (keyof BalancePreviewRow)[];
  return [headers.join("\t"), ...rows.map((row) => headers.map((header) => String(row[header])).join("\t"))].join("\n");
}

export function balanceRowsToJson(rows: BalancePreviewRow[]): string {
  return JSON.stringify(rows, null, 2);
}

function normalizeDifficultyId(difficultyId: DifficultyId): DifficultyId {
  return difficultyDefinitions[difficultyId]?.id ?? "standard";
}

function createDeterministicRng(seed: number): { next: () => number } {
  let currentSeed = seed;
  return {
    next: () => {
      currentSeed = (1664525 * currentSeed + 1013904223) % 4294967296;
      return currentSeed / 4294967296;
    },
  };
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function calculateDifficultyRatio(enemyDemand: number, rankSkillPower: number): number {
  return round(safeRatio(enemyDemand / rankSkillPower), 3);
}

function calculateAvgRelicRatio(enemyDemand: number, rankSkillPower: number, relicPowerAvg: number): number {
  return round(safeRatio(enemyDemand / (rankSkillPower * relicPowerAvg)), 3);
}

function calculateEstimatedTime(maxHp: number, rankSkillPower: number, relicPowerAvg: number): number {
  return round(safeRatio((maxHp * 60) / (100 * rankSkillPower * relicPowerAvg)), 1);
}

function aggregateTraitEffects(traits: EnemyTraitId[]): {
  gravityMultiplier: number;
  garbageMultiplier: number;
} {
  return traits.reduce(
    (aggregate, trait) => {
      const effect = enemyTraitEffects[trait] as EnemyTraitEffect;
      return {
        gravityMultiplier: aggregate.gravityMultiplier * (effect.gravityMultiplier ?? 1),
        garbageMultiplier: aggregate.garbageMultiplier * (effect.garbageMultiplier ?? 1),
      };
    },
    { gravityMultiplier: 1, garbageMultiplier: 1 },
  );
}

function formatTraitPressureBreakdown(traits: EnemyTraitId[]): string {
  if (traits.length === 0) return "-";
  return traits
    .map((trait) => {
      const effect = enemyTraitEffects[trait] as EnemyTraitEffect;
      return [
        `${trait}:`,
        `hp x${effect.hpMultiplier ?? 1}`,
        `gravity x${effect.gravityMultiplier ?? 1}`,
        `garbage x${effect.garbageMultiplier ?? 1}`,
        `pattern x${effect.patternMultiplier ?? 1}`,
        `intent x${effect.intentEveryActionsMultiplier ?? 1}`,
        `pattern +${effect.patternPressureAdd ?? 0}`,
        `restriction +${effect.restrictionPressureAdd ?? 0}`,
      ].join(" ");
    })
    .join(" | ");
}
