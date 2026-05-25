import type { ClearResult } from "../tetris/ClearResult";
import { createDefaultCombatFeedbackEvent, type CombatFeedbackEvent, type CombatFeedbackIntensity, type CreateCombatFeedbackEventInput } from "./CombatFeedbackEvent";

let nextCombatFeedbackSequenceId = 1;

export class CombatFeedbackEventFactory {
  create(input: CreateCombatFeedbackEventInput): CombatFeedbackEvent {
    const defaults = createDefaultCombatFeedbackEvent();
    const clearResult = input.clearResult;
    const sequenceId = nextCombatFeedbackSequenceId++;
    return {
      eventId: `combat-feedback-${sequenceId}`,
      sequenceId,
      createdAtMs: nowMs(),
      clearName: clearResult?.displayName ?? defaults.clearName,
      clearedLines: clearResult?.linesCleared ?? defaults.clearedLines,
      attackAmount: input.attackResult?.totalDamage ?? defaults.attackAmount,
      offsetAmount: input.offsetAmount ?? defaults.offsetAmount,
      comboCount: input.comboB2BResult?.comboCount ?? defaults.comboCount,
      isComboActive: input.comboB2BResult?.isComboActive ?? defaults.isComboActive,
      isBackToBack: input.comboB2BResult?.isBackToBack ?? defaults.isBackToBack,
      backToBackCount: input.comboB2BResult?.backToBackCount ?? defaults.backToBackCount,
      isPerfectClear: clearResult?.isPerfectClear ?? defaults.isPerfectClear,
      dangerLevel: input.dangerState?.dangerLevel ?? defaults.dangerLevel,
      intensity: getIntensity(clearResult),
    };
  }
}

export function getIntensity(clearResult?: ClearResult): CombatFeedbackIntensity {
  if (!clearResult || clearResult.linesCleared <= 0) return "none";
  if (clearResult.isPerfectClear) return "critical";
  if (clearResult.isTSpin && clearResult.linesCleared >= 2) return "high";
  if (clearResult.lineClearName === "Tetris") return "high";
  if (clearResult.lineClearName === "Triple") return "medium";
  if (clearResult.lineClearName === "Single" || clearResult.lineClearName === "Double") return "low";
  return "none";
}

function nowMs(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
