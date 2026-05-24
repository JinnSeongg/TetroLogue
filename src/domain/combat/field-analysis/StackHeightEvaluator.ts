import type { FieldAnalysisConfig } from "./FieldAnalysisConfig";
import type { FieldAnalysisTag, StackLevel } from "./FieldAnalysisTypes";

export type StackHeightEvaluation = {
  stackLevel: StackLevel;
  tags: FieldAnalysisTag[];
};

export class StackHeightEvaluator {
  evaluate(maxHeight: number, config: FieldAnalysisConfig): StackHeightEvaluation {
    const tags: FieldAnalysisTag[] = [];

    if (maxHeight <= config.lowStackMaxHeight) {
      tags.push("LowStack");
    } else if (maxHeight <= config.midStackMaxHeight) {
      tags.push("MidStack");
    }

    if (maxHeight >= config.highStackThreshold) {
      tags.push("HighStack");
    }

    if (maxHeight >= config.criticalStackThreshold) {
      tags.push("CriticalStack");
    }

    return {
      stackLevel: this.getStackLevel(maxHeight, config),
      tags,
    };
  }

  private getStackLevel(maxHeight: number, config: FieldAnalysisConfig): StackLevel {
    if (maxHeight >= config.criticalStackThreshold) return "Critical";
    if (maxHeight >= config.highStackThreshold) return "High";
    if (maxHeight > config.lowStackMaxHeight && maxHeight <= config.midStackMaxHeight) return "Mid";
    return "Low";
  }
}
