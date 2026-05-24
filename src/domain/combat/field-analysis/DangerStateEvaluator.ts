import type { FieldAnalysisConfig } from "./FieldAnalysisConfig";
import type { DangerLevel, FieldAnalysisTag } from "./FieldAnalysisTypes";

export type DangerStateInput = {
  maxHeight: number;
  holeCount: number;
  garbageRowCount: number;
  bumpiness: number;
};

export type DangerStateEvaluation = {
  dangerLevel: DangerLevel;
  dangerScore: number;
  dangerReasons: string[];
  tags: FieldAnalysisTag[];
};

export class DangerStateEvaluator {
  evaluate(input: DangerStateInput, config: FieldAnalysisConfig): DangerStateEvaluation {
    const dangerScore = this.calculateDangerScore(input, config);
    const dangerReasons = this.getDangerReasons(input, config);
    const hasCriticalCondition =
      input.maxHeight >= config.criticalHeightThreshold ||
      input.holeCount >= config.criticalHoleThreshold ||
      input.garbageRowCount >= config.criticalGarbageRows;
    const hasDangerCondition =
      input.maxHeight >= config.dangerHeightThreshold ||
      input.holeCount >= config.dangerHoleThreshold ||
      input.garbageRowCount >= config.dangerGarbageRows;
    const hasWarningCondition =
      input.maxHeight >= config.warningHeightThreshold ||
      input.holeCount >= config.warningHoleThreshold ||
      input.garbageRowCount >= config.warningGarbageRows;
    const dangerLevel = this.getDangerLevel(dangerScore, { hasCriticalCondition, hasDangerCondition, hasWarningCondition }, config);

    return {
      dangerLevel,
      dangerScore,
      dangerReasons,
      tags: this.getTags(dangerLevel),
    };
  }

  private calculateDangerScore(input: DangerStateInput, config: FieldAnalysisConfig): number {
    const heightScore = (input.maxHeight / config.visibleHeight) * config.dangerHeightScoreWeight;
    const holeScore = Math.min(input.holeCount / config.criticalHoleThreshold, 1) * config.dangerHoleScoreWeight;
    const garbageScore = Math.min(input.garbageRowCount / config.criticalGarbageRows, 1) * config.dangerGarbageScoreWeight;
    const bumpinessScore = Math.min(input.bumpiness / config.criticalBumpinessThreshold, 1) * config.dangerBumpinessScoreWeight;

    return Math.round(heightScore + holeScore + garbageScore + bumpinessScore);
  }

  private getDangerLevel(
    dangerScore: number,
    conditions: { hasCriticalCondition: boolean; hasDangerCondition: boolean; hasWarningCondition: boolean },
    config: FieldAnalysisConfig,
  ): DangerLevel {
    if (conditions.hasCriticalCondition || dangerScore >= config.dangerScoreCritical) return "Critical";
    if (conditions.hasDangerCondition || dangerScore >= config.dangerScoreDanger) return "Danger";
    if (conditions.hasWarningCondition || dangerScore >= config.dangerScoreWarning) return "Warning";
    return "Safe";
  }

  private getDangerReasons(input: DangerStateInput, config: FieldAnalysisConfig): string[] {
    const reasons: string[] = [];

    if (input.maxHeight >= config.warningHeightThreshold) reasons.push("HighStack");
    if (input.holeCount >= config.warningHoleThreshold) reasons.push("ManyHoles");
    if (input.garbageRowCount >= config.warningGarbageRows) reasons.push("GarbagePressure");
    if (input.bumpiness >= config.criticalBumpinessThreshold) reasons.push("HighBumpiness");

    return reasons;
  }

  private getTags(dangerLevel: DangerLevel): FieldAnalysisTag[] {
    if (dangerLevel === "Safe") return [];
    if (dangerLevel === "Warning") return ["Warning"];
    if (dangerLevel === "Danger") return ["Warning", "Danger", "HighRiskField"];
    return ["Warning", "Danger", "Critical", "HighRiskField"];
  }
}
