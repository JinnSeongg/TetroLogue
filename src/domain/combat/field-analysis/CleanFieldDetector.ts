import type { FieldAnalysisConfig } from "./FieldAnalysisConfig";
import type { FieldAnalysisTag, StackLevel } from "./FieldAnalysisTypes";

export type CleanFieldInput = {
  maxHeight: number;
  holeCount: number;
  bumpiness: number;
  garbageRowCount: number;
  stackLevel: StackLevel;
};

export type CleanFieldDetectionResult = {
  isCleanField: boolean;
  cleanFieldScore: number;
  tags: FieldAnalysisTag[];
};

export class CleanFieldDetector {
  detect(input: CleanFieldInput, config: FieldAnalysisConfig): CleanFieldDetectionResult {
    const checks = [
      input.maxHeight <= config.cleanFieldMaxHeight,
      input.holeCount <= config.cleanFieldMaxHoles,
      input.bumpiness <= config.cleanFieldMaxBumpiness,
      input.garbageRowCount <= config.cleanFieldMaxGarbageRows,
      !config.cleanFieldRequiresNoCriticalStack || input.stackLevel !== "Critical",
    ];
    const passedChecks = checks.filter(Boolean).length;
    const cleanFieldScore = Math.round((passedChecks / checks.length) * 100);
    const isCleanField = passedChecks === checks.length;
    const tags: FieldAnalysisTag[] = [];

    if (isCleanField) tags.push("CleanField");
    if (isCleanField && this.isStableField(input, cleanFieldScore, config)) tags.push("StableField");

    return { isCleanField, cleanFieldScore, tags };
  }

  private isStableField(input: CleanFieldInput, cleanFieldScore: number, config: FieldAnalysisConfig): boolean {
    return (
      cleanFieldScore >= config.stableFieldMinScore &&
      input.maxHeight <= config.stableFieldMaxHeight &&
      input.holeCount <= config.stableFieldMaxHoles &&
      input.bumpiness <= config.stableFieldMaxBumpiness &&
      input.garbageRowCount <= config.stableFieldMaxGarbageRows
    );
  }
}
