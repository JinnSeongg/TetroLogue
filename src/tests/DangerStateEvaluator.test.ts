import { describe, expect, it } from "vitest";
import { DangerStateEvaluator, type DangerStateInput } from "../domain/combat/field-analysis/DangerStateEvaluator";
import { defaultFieldAnalysisConfig, type FieldAnalysisConfig } from "../domain/combat/field-analysis/FieldAnalysisConfig";
import { FieldAnalyzer } from "../domain/combat/field-analysis/FieldAnalyzer";
import { Board } from "../domain/tetris/Board";
import type { Cell } from "../domain/tetris/Cell";

describe("DangerStateEvaluator", () => {
  it("marks a low clean field as Safe", () => {
    const result = new DangerStateEvaluator().evaluate(input({ maxHeight: 2, holeCount: 0, garbageRowCount: 0, bumpiness: 0 }), config());

    expect(result.dangerLevel).toBe("Safe");
    expect(result.tags).toEqual([]);
  });

  it("marks warning-or-higher when maxHeight reaches warning threshold", () => {
    const result = new DangerStateEvaluator().evaluate(input({ maxHeight: 10 }), config());

    expect(["Warning", "Danger", "Critical"]).toContain(result.dangerLevel);
    expect(result.dangerReasons).toContain("HighStack");
  });

  it("marks Critical when maxHeight reaches critical threshold", () => {
    const result = new DangerStateEvaluator().evaluate(input({ maxHeight: 18 }), config());

    expect(result.dangerLevel).toBe("Critical");
    expect(result.tags).toContain("Critical");
  });

  it("marks Danger or higher when holeCount reaches danger threshold", () => {
    const result = new DangerStateEvaluator().evaluate(input({ holeCount: 6 }), config());

    expect(["Danger", "Critical"]).toContain(result.dangerLevel);
    expect(result.dangerReasons).toContain("ManyHoles");
  });

  it("marks Critical when garbageRowCount reaches critical threshold", () => {
    const result = new DangerStateEvaluator().evaluate(input({ garbageRowCount: 12 }), config());

    expect(result.dangerLevel).toBe("Critical");
    expect(result.dangerReasons).toContain("GarbagePressure");
  });

  it("uses dangerScore thresholds for Warning, Danger, and Critical", () => {
    const warning = new DangerStateEvaluator().evaluate(input({ maxHeight: 1 }), scoreOnlyConfig({ dangerScoreWarning: 1, dangerScoreDanger: 10, dangerScoreCritical: 20 }));
    const danger = new DangerStateEvaluator().evaluate(input({ maxHeight: 1 }), scoreOnlyConfig({ dangerScoreWarning: 1, dangerScoreDanger: 2, dangerScoreCritical: 20 }));
    const critical = new DangerStateEvaluator().evaluate(input({ maxHeight: 1 }), scoreOnlyConfig({ dangerScoreWarning: 1, dangerScoreDanger: 2, dangerScoreCritical: 2 }));

    expect(warning.dangerLevel).toBe("Warning");
    expect(danger.dangerLevel).toBe("Danger");
    expect(critical.dangerLevel).toBe("Critical");
  });

  it("records danger reasons", () => {
    const result = new DangerStateEvaluator().evaluate(input({ maxHeight: 10, holeCount: 3, garbageRowCount: 4, bumpiness: 16 }), config());

    expect(result.dangerReasons).toEqual(["HighStack", "ManyHoles", "GarbagePressure", "HighBumpiness"]);
  });

  it("changes dangerLevel when config changes", () => {
    const safe = new DangerStateEvaluator().evaluate(input({ maxHeight: 8 }), { ...config(), dangerScoreWarning: 30 });
    const warning = new DangerStateEvaluator().evaluate(input({ maxHeight: 8 }), { ...config(), dangerScoreWarning: 10 });

    expect(safe.dangerLevel).toBe("Safe");
    expect(warning.dangerLevel).toBe("Warning");
  });

  it("adds Danger tag for Danger state", () => {
    const result = new DangerStateEvaluator().evaluate(input({ maxHeight: 1 }), scoreOnlyConfig({ dangerScoreWarning: 1, dangerScoreDanger: 2, dangerScoreCritical: 20 }));

    expect(result.tags).toContain("Warning");
    expect(result.tags).toContain("Danger");
    expect(result.tags).toContain("HighRiskField");
  });

  it("adds Critical and HighRiskField tags for Critical state", () => {
    const result = new DangerStateEvaluator().evaluate(input({ maxHeight: 18 }), config());

    expect(result.tags).toContain("Critical");
    expect(result.tags).toContain("HighRiskField");
  });

  it("uses analysis input only and does not require a Board", () => {
    expect(new DangerStateEvaluator().evaluate(input({ holeCount: 1 }), config()).dangerScore).toBeGreaterThanOrEqual(0);
  });

  it("integrates with FieldAnalyzer", () => {
    const result = new FieldAnalyzer().analyze(createBoardFromHeights([18]), configFor(1, 20));

    expect(result.dangerLevel).toBe("Critical");
    expect(result.dangerScore).toBeGreaterThan(0);
    expect(result.dangerReasons).toContain("HighStack");
    expect(result.tags).toContain("Critical");
  });
});

function config(): FieldAnalysisConfig {
  return { ...defaultFieldAnalysisConfig };
}

function configFor(boardWidth: number, visibleHeight: number): FieldAnalysisConfig {
  return {
    ...defaultFieldAnalysisConfig,
    boardWidth,
    visibleHeight,
  };
}

function scoreOnlyConfig(overrides: Partial<FieldAnalysisConfig>): FieldAnalysisConfig {
  return {
    ...config(),
    warningHeightThreshold: 99,
    dangerHeightThreshold: 99,
    criticalHeightThreshold: 99,
    warningHoleThreshold: 99,
    dangerHoleThreshold: 99,
    criticalHoleThreshold: 99,
    warningGarbageRows: 99,
    dangerGarbageRows: 99,
    criticalGarbageRows: 99,
    ...overrides,
  };
}

function input(overrides: Partial<DangerStateInput>): DangerStateInput {
  return {
    maxHeight: 0,
    holeCount: 0,
    garbageRowCount: 0,
    bumpiness: 0,
    ...overrides,
  };
}

function createBoardFromHeights(heights: number[], height = 20): Board {
  const cells: Cell[][] = Array.from({ length: height }, (_, y) =>
    heights.map((columnHeight) => ({
      filled: y >= height - columnHeight,
      pieceType: y >= height - columnHeight ? ("I" as const) : undefined,
    })),
  );

  return new Board(heights.length, height, cells);
}
