import type { EnemyCalculatedStats } from "../balance/balanceTypes";

export type EnemyTraitId =
  | "garbage_light"
  | "garbage_heavy"
  | "garbage_wave"
  | "gravity_pressure"
  | "tank"
  | "fragile"
  | "aggressive"
  | "slow"
  | "boss_phase"
  | "final_boss";

export type EnemyTraitEffect = {
  id: EnemyTraitId;
  description: string;
  hpMultiplier?: number;
  gravityMultiplier?: number;
  garbageMultiplier?: number;
  patternMultiplier?: number;
  intentEveryActionsMultiplier?: number;
  intentEveryActionsAdd?: number;
  patternPressureAdd?: number;
  restrictionPressureAdd?: number;
  tags?: string[];
};

export type EnemyTraitEffectResult = Pick<
  EnemyCalculatedStats,
  | "maxHp"
  | "gravityMs"
  | "softDropMs"
  | "enemyGpm"
  | "intentEveryActions"
  | "garbageLines"
  | "patternPressure"
  | "restrictionPressure"
>;
