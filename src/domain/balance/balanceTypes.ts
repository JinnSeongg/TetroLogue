import type { EnemyTraitId } from "../enemy/EnemyTrait";

export type DifficultyId = "explorer" | "standard" | "advanced" | "master" | "void";

export type DifficultyDefinition = {
  id: DifficultyId;
  name: string;
  description: string;
  demandMultiplier: number;
  hpMultiplier: number;
  gravityMultiplier: number;
  garbageMultiplier: number;
  patternMultiplier: number;
};

export type EnemyRole = "normal" | "dangerous" | "elite" | "miniboss" | "boss" | "finalBoss";

export type EnemyCalculatedStats = {
  floor: number;
  normalizedProgress: number;
  difficultyId: DifficultyId;
  baseDemand: number;
  enemyDemand: number;
  enemyDemandToBaseRatio: number;
  maxHp: number;
  hpToBaseHpRatio: number;
  gravityMs: number;
  softDropMs: number;
  lockDelayMs: number;
  enemyGpm: number;
  uncappedEnemyGpm: number;
  cappedGpm: boolean;
  intentEveryActions: number;
  garbageLines: number;
  garbageDelayActions: number;
  patternPressure: number;
  restrictionPressure: number;
};

export type EnemyStatCalculationInput = {
  floor: number;
  difficultyId?: DifficultyId;
  enemyRole?: EnemyRole;
  traits?: EnemyTraitId[];
};
