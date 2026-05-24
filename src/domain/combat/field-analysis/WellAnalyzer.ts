import type { FieldAnalysisConfig } from "./FieldAnalysisConfig";
import type { FieldAnalysisTag } from "./FieldAnalysisTypes";

export type WellAnalysisResult = {
  wellDepths: number[];
  deepestWellDepth: number;
  wellColumn: number | null;
  hasDeepWell: boolean;
  tags: FieldAnalysisTag[];
};

export class WellAnalyzer {
  analyze(columnHeights: number[], config: FieldAnalysisConfig): WellAnalysisResult {
    const wellDepths = columnHeights.map((height, index) => this.getWellDepth(columnHeights, index, height, config));
    const deepestWellDepth = wellDepths.reduce((deepest, depth) => Math.max(deepest, depth), 0);
    const wellColumn = deepestWellDepth > 0 ? wellDepths.findIndex((depth) => depth === deepestWellDepth) : null;

    return {
      wellDepths,
      deepestWellDepth,
      wellColumn,
      hasDeepWell: deepestWellDepth >= config.deepWellThreshold,
      tags: this.getTags(deepestWellDepth, config),
    };
  }

  private getWellDepth(columnHeights: number[], index: number, height: number, config: FieldAnalysisConfig): number {
    const leftHeight = columnHeights[index - 1];
    const rightHeight = columnHeights[index + 1];
    let depth = 0;

    if (leftHeight === undefined || rightHeight === undefined) {
      if (!config.allowEdgeWell) return 0;
      depth = leftHeight === undefined ? (rightHeight ?? 0) - height : leftHeight - height;
    } else {
      depth = Math.min(leftHeight, rightHeight) - height;
    }

    return depth >= config.wellMinDepth ? depth : 0;
  }

  private getTags(deepestWellDepth: number, config: FieldAnalysisConfig): FieldAnalysisTag[] {
    const tags: FieldAnalysisTag[] = [];

    if (deepestWellDepth >= config.wellMinDepth) tags.push("HasWell");
    if (deepestWellDepth >= config.deepWellThreshold) tags.push("DeepWell");
    if (deepestWellDepth >= config.veryDeepWellThreshold) tags.push("VeryDeepWell");

    return tags;
  }
}
