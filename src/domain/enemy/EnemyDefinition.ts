import type { Id } from "../shared/Id";
import type { EnemyDefenseRule } from "./EnemyDefenseRule";

export type EnemyDefinition = {
  id: Id;
  name: string;
  maxHp: number;
  defenseRules: EnemyDefenseRule[];
  attackRules: EnemyAttackRule[];
  pattern: EnemyPattern;
  phases: EnemyPhase[];
};

export type EnemyAttackRule = {
  id: Id;
  description: string;
  garbageLines?: number;
};

export type EnemyPattern = {
  id: Id;
  description: string;
  intentEveryActions?: number;
  intentDelayActions?: number;
  intentDescription?: string;
  garbageLines?: number;
};

export type EnemyPhase = {
  hpThresholdRatio: number;
  description: string;
};
