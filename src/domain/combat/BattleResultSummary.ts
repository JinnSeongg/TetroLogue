import type { DifficultyId, EnemyCalculatedStats } from "../balance/balanceTypes";
import type { EnemyRole } from "../balance/balanceTypes";
import type { EnemyTraitId } from "../enemy/EnemyTrait";

export type BattleResult = "win" | "loss";

export type CombatTelemetry = {
  battleDurationMs: number;
  totalPlayerAttackGenerated: number;
  totalAttackBlockedByPendingGarbage: number;
  totalDamageDealtToEnemy: number;
  totalGarbageQueued: number;
  totalGarbageCancelled: number;
  totalGarbageApplied: number;
  linesClearedTotal: number;
  maxBoardHeight: number;
};

export type BattleResultSummary = {
  floor: number;
  difficultyId: DifficultyId;
  enemyId: string;
  enemyRole: EnemyRole;
  enemyTraits: EnemyTraitId[];
  calculatedEnemyStats?: EnemyCalculatedStats;
  battleDurationSeconds: number;
  totalPlayerAttackGenerated: number;
  totalAttackBlockedByPendingGarbage: number;
  totalDamageDealtToEnemy: number;
  totalGarbageQueued: number;
  totalGarbageCancelled: number;
  totalGarbageApplied: number;
  linesClearedTotal: number;
  estimatedSurvivalTax: number;
  maxBoardHeight: number;
  finalBoardHeight: number;
  result: BattleResult;
  selectedRelics: string[];
};

export function createInitialCombatTelemetry(initialBoardHeight = 0): CombatTelemetry {
  return {
    battleDurationMs: 0,
    totalPlayerAttackGenerated: 0,
    totalAttackBlockedByPendingGarbage: 0,
    totalDamageDealtToEnemy: 0,
    totalGarbageQueued: 0,
    totalGarbageCancelled: 0,
    totalGarbageApplied: 0,
    linesClearedTotal: 0,
    maxBoardHeight: initialBoardHeight,
  };
}
