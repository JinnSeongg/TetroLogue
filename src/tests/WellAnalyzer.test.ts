import { describe, expect, it } from "vitest";
import { defaultFieldAnalysisConfig, type FieldAnalysisConfig } from "../domain/combat/field-analysis/FieldAnalysisConfig";
import { WellAnalyzer } from "../domain/combat/field-analysis/WellAnalyzer";

describe("WellAnalyzer", () => {
  it("finds no well on flat heights", () => {
    const result = new WellAnalyzer().analyze([3, 3, 3], config());

    expect(result.wellDepths).toEqual([0, 0, 0]);
    expect(result.deepestWellDepth).toBe(0);
    expect(result.wellColumn).toBeNull();
    expect(result.tags).not.toContain("HasWell");
  });

  it("detects [5, 1, 5] as a depth 4 well at column 1", () => {
    const result = new WellAnalyzer().analyze([5, 1, 5], config());

    expect(result.wellDepths).toEqual([0, 4, 0]);
    expect(result.deepestWellDepth).toBe(4);
    expect(result.wellColumn).toBe(1);
    expect(result.tags).toContain("HasWell");
    expect(result.tags).toContain("DeepWell");
  });

  it("detects [6, 2, 5] as a depth 3 well", () => {
    const result = new WellAnalyzer().analyze([6, 2, 5], config());

    expect(result.wellDepths).toEqual([0, 3, 0]);
    expect(result.deepestWellDepth).toBe(3);
    expect(result.wellColumn).toBe(1);
  });

  it("detects edge wells only when allowEdgeWell is true", () => {
    const withEdgeWell = new WellAnalyzer().analyze([1, 5, 5], { ...config(), allowEdgeWell: true });
    const withoutEdgeWell = new WellAnalyzer().analyze([1, 5, 5], { ...config(), allowEdgeWell: false });

    expect(withEdgeWell.wellDepths).toEqual([4, 0, 0]);
    expect(withEdgeWell.wellColumn).toBe(0);
    expect(withoutEdgeWell.wellDepths).toEqual([0, 0, 0]);
    expect(withoutEdgeWell.wellColumn).toBeNull();
  });

  it("uses the left column when deepest well depth ties", () => {
    const result = new WellAnalyzer().analyze([5, 1, 5, 1, 5], config());

    expect(result.deepestWellDepth).toBe(4);
    expect(result.wellColumn).toBe(1);
  });

  it("changes deep well tagging when config threshold changes", () => {
    const shallowConfigResult = new WellAnalyzer().analyze([5, 2, 5], { ...config(), deepWellThreshold: 4 });
    const deepConfigResult = new WellAnalyzer().analyze([5, 2, 5], { ...config(), deepWellThreshold: 3 });

    expect(shallowConfigResult.deepestWellDepth).toBe(3);
    expect(shallowConfigResult.tags).not.toContain("DeepWell");
    expect(deepConfigResult.tags).toContain("DeepWell");
  });

  it("uses column heights only", () => {
    const result = new WellAnalyzer().analyze([0, 6], config());

    expect(result.wellDepths).toEqual([6, 0]);
    expect(result.wellColumn).toBe(0);
  });

  it("tags very deep wells from config", () => {
    const result = new WellAnalyzer().analyze([8, 1, 8], config());

    expect(result.deepestWellDepth).toBe(7);
    expect(result.tags).toContain("VeryDeepWell");
  });
});

function config(): FieldAnalysisConfig {
  return {
    ...defaultFieldAnalysisConfig,
    boardWidth: 3,
  };
}
