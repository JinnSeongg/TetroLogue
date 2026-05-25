import type { AttackResult } from "./AttackTypes";
import type { ComboB2BResult } from "./ComboB2BTracker";
import type { DangerLevel } from "./field-analysis/FieldAnalysisTypes";
import type { ClearResult } from "../tetris/ClearResult";

export type CombatFeedbackIntensity = "none" | "low" | "medium" | "high" | "critical";

export type CombatFeedbackEvent = {
  eventId: string;
  sequenceId: number;
  createdAtMs: number;
  clearName: string;
  clearedLines: number;
  attackAmount: number;
  offsetAmount: number;
  comboCount: number;
  isComboActive: boolean;
  isBackToBack: boolean;
  backToBackCount: number;
  isPerfectClear: boolean;
  dangerLevel: DangerLevel;
  intensity: CombatFeedbackIntensity;
};

export type CombatFeedbackDangerState = {
  dangerLevel: DangerLevel;
};

export type CreateCombatFeedbackEventInput = {
  clearResult?: ClearResult;
  attackResult?: AttackResult;
  comboB2BResult?: ComboB2BResult;
  dangerState?: CombatFeedbackDangerState;
  offsetAmount?: number;
};

export function createDefaultCombatFeedbackEvent(): CombatFeedbackEvent {
  return {
    eventId: "combat-feedback-default",
    sequenceId: 0,
    createdAtMs: 0,
    clearName: "None",
    clearedLines: 0,
    attackAmount: 0,
    offsetAmount: 0,
    comboCount: 0,
    isComboActive: false,
    isBackToBack: false,
    backToBackCount: 0,
    isPerfectClear: false,
    dangerLevel: "Safe",
    intensity: "none",
  };
}
