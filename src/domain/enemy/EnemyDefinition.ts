import type { Id } from "../shared/Id";
import type { EnemyRole } from "../balance/balanceTypes";
import type { EnemyDefenseRule } from "./EnemyDefenseRule";
import type { EnemyTraitId } from "./EnemyTrait";

export type EnemyDefinition = {
  id: Id;
  name: string;
  description: string;
  role: EnemyRole;
  traits: EnemyTraitId[];
  intentStyle: EnemyIntentStyle;
  basePattern: EnemyPattern;
  theme?: EnemyTheme;
  /**
   * Legacy combat fallback. Runtime combat still reads this until the balance
   * calculator is wired into StartCombatUseCase.
   */
  maxHp: number;
  /**
   * Legacy defense fallback. Traits are the new balance input, but existing
   * combat still uses these rules for damage reduction.
   */
  defenseRules: EnemyDefenseRule[];
  /**
   * Legacy preview fallback kept for compatibility with existing logs/tests.
   */
  attackRules: EnemyAttackRule[];
  /**
   * Legacy intent fallback. EnemyPatternSystem still reads this until it can
   * consume calculated EnemyCalculatedStats.
   */
  pattern: EnemyPattern;
  garbagePattern?: EnemyGarbagePattern;
  phases: EnemyPhase[];
};

export type EnemyIntentStyle = "none" | "steady" | "burst" | "wave" | "counter" | "bossCycle";

export type EnemyTheme = {
  accent?: string;
  boardEffect?: string;
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

export type EnemyGarbagePattern =
  | FixedIntervalGarbagePattern
  | SequenceGarbagePattern
  | PhaseGarbagePattern;

export type FixedIntervalGarbagePattern = {
  type: "fixedInterval";
  lines: number;
  intervalMs: number;
  travelDelayMs: number;
  initialDelayMs?: number;
};

export type SequenceGarbagePattern = {
  type: "sequence";
  loop: boolean;
  steps: Array<{
    delayMs: number;
    lines: number;
    travelDelayMs?: number;
  }>;
};

export type PhaseGarbagePattern = {
  type: "phase";
  phases: Array<{
    hpRatioGte: number;
    pattern: FixedIntervalGarbagePattern | SequenceGarbagePattern;
  }>;
};

export type EnemyPhase = {
  hpThresholdRatio: number;
  description: string;
};
