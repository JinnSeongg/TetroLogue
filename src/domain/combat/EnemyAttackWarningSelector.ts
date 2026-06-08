import type { CombatState } from "./CombatState";
import type { EnemyGarbagePattern } from "../enemy/EnemyDefinition";

export type EnemyAttackWarningState = {
  nextAttackLines: number;
  nextAttackRemainingMs: number | null;
  pendingGarbageLines: number;
  dangerLevel: "none" | "normal" | "warning" | "danger";
};

export function selectEnemyAttackWarningState(combat?: CombatState): EnemyAttackWarningState {
  if (!combat || combat.result !== "ongoing") {
    return { nextAttackLines: 0, nextAttackRemainingMs: null, pendingGarbageLines: 0, dangerLevel: "none" };
  }

  const nextAttack = combat.enemy.enemyGarbageScheduler.getNextAttackInfo(resolveEnemyGarbagePattern(combat));
  const nextAttackRemainingMs = nextAttack?.remainingMs ?? null;
  return {
    nextAttackLines: nextAttack?.lines ?? 0,
    nextAttackRemainingMs,
    pendingGarbageLines: combat.enemy.garbageQueue.getPendingLines(),
    dangerLevel: dangerLevelFor(nextAttackRemainingMs),
  };
}

function dangerLevelFor(nextAttackRemainingMs: number | null): EnemyAttackWarningState["dangerLevel"] {
  if (nextAttackRemainingMs === null) return "none";
  if (nextAttackRemainingMs <= 1000) return "danger";
  if (nextAttackRemainingMs <= 3000) return "warning";
  return "normal";
}

function resolveEnemyGarbagePattern(combat: CombatState): EnemyGarbagePattern | undefined {
  const explicitPattern = combat.enemy.garbagePattern ?? combat.enemy.definition.garbagePattern;
  if (explicitPattern) return explicitPattern;
  const lines = combat.enemy.calculatedStats?.garbageLines ?? combat.enemy.definition.pattern.garbageLines ?? 0;
  if (lines <= 0) return undefined;
  const legacyInterval = combat.enemy.definition.pattern.intentEveryActions;
  return {
    type: "fixedInterval",
    lines,
    intervalMs: legacyInterval ? legacyInterval * 2000 : 12000,
    travelDelayMs: 2500,
    initialDelayMs: 5000,
  };
}
