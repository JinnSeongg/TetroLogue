import { describe, expect, it, vi } from "vitest";
import { generateBalancePreview, getBalancePreviewRows, logBalancePreview } from "../debug/balanceDebug";
import { calculateEnemyStats } from "../domain/balance/enemyStatCalculator";
import { safeNumber, safeRatio, safeText } from "../debug/balanceDebugGuards";

describe("balance debug preview", () => {
  it("generates 1-30 standard preview rows with guarded values", () => {
    const rows = getBalancePreviewRows("standard");

    expect(rows).toHaveLength(30);
    for (const row of rows) {
      expect(row.floor).toBeGreaterThanOrEqual(1);
      expect(row.difficulty).toBe("standard");
      expect(row.selectedEnemyId.length).toBeGreaterThan(0);
      expect(row.selectedEnemyName.length).toBeGreaterThan(0);
      expect(row.maxHp).toBeGreaterThan(0);
      expect(row.gravityMs).toBeGreaterThan(0);
      expect(row.enemyGpm).toBeGreaterThan(0);
      expect(row.intentEveryActions).toBeGreaterThan(0);
      expect(row.garbageLines).toBeGreaterThan(0);
      expect(row.targetTime).toBeGreaterThan(0);
      expect(row.difficultyMultiplier).toBeGreaterThan(0);
      expect(row.roleMultiplier).toBeGreaterThan(0);
      expect(row.traitDemandMultiplier).toBeGreaterThan(0);
      expect(row.rawEnemyDemand).toBeGreaterThan(0);
      expect(row.enemyDemandClampMax).toBeGreaterThan(0);
      expect(row.gravityPressure).toBeGreaterThan(0);
      expect(row.garbagePressure).toBeGreaterThan(0);
      expect(row.patternPressure).toBeGreaterThan(0);
      expect(row.traitDemandBreakdown.length).toBeGreaterThan(0);
      expect(row.traitPressureBreakdown.length).toBeGreaterThan(0);
      expect(row.relicAvgPower).toBeGreaterThan(0);
      expect(row.difficultyRatioD).toBeGreaterThan(0);
      expect(row.difficultyRatioC).toBeGreaterThan(0);
      expect(row.difficultyRatioB).toBeGreaterThan(0);
      expect(row.difficultyRatioA).toBeGreaterThan(0);
      expect(row.difficultyRatioS).toBeGreaterThan(0);
      expect(row.difficultyRatioSS).toBeGreaterThan(0);
      expect(row.difficultyRatioU).toBeGreaterThan(0);
      expect(row.difficultyRatioX).toBeGreaterThan(0);
      expect(row.ratioDAvgRelic).toBeGreaterThan(0);
      expect(row.ratioCAvgRelic).toBeGreaterThan(0);
      expect(row.ratioBAvgRelic).toBeGreaterThan(0);
      expect(row.ratioAAvgRelic).toBeGreaterThan(0);
      expect(row.ratioSAvgRelic).toBeGreaterThan(0);
      expect(row.ratioSSAvgRelic).toBeGreaterThan(0);
      expect(row.ratioUAvgRelic).toBeGreaterThan(0);
      expect(row.ratioXAvgRelic).toBeGreaterThan(0);
      expect(row.estimatedTimeB).toBeGreaterThan(0);
      expect(row.estimatedTimeA).toBeGreaterThan(0);
      expect(row.estimatedTimeS).toBeGreaterThan(0);
      expect(row.estimatedTimeSS).toBeGreaterThan(0);
    }
  });

  it("uses the new relic average and SkillPower ratios at floor 30", () => {
    const floor30 = getBalancePreviewRows("standard").find((row) => row.floor === 30);
    if (!floor30) throw new Error("Expected floor 30 preview row");

    expect(floor30.relicAvgPower).toBeCloseTo(3, 3);
    expect(floor30.ratioSAvgRelic).toBeCloseTo(floor30.enemyDemand / (2.2 * floor30.relicAvgPower), 3);
  });

  it("exposes enemy demand breakdown without changing the final demand", () => {
    const floor30 = getBalancePreviewRows("standard").find((row) => row.floor === 30);
    if (!floor30) throw new Error("Expected floor 30 preview row");

    expect(floor30.difficultyMultiplier).toBe(0.65);
    expect(floor30.rawEnemyDemand).toBeCloseTo(floor30.baseDemand * floor30.difficultyMultiplier * floor30.roleMultiplier, 3);
    expect(floor30.enemyDemand).toBeCloseTo(floor30.rawEnemyDemand, 3);
  });

  it("does not multiply relic average into enemy demand", () => {
    const floor30 = getBalancePreviewRows("standard").find((row) => row.floor === 30);
    if (!floor30) throw new Error("Expected floor 30 preview row");

    expect(floor30.rawEnemyDemand).toBeCloseTo(4.095, 3);
    expect(floor30.enemyDemand).toBeCloseTo(4.095, 3);
    expect(floor30.relicAvgPower).toBeCloseTo(3, 3);
    expect(floor30.difficultyRatioS).toBeCloseTo(4.095 / 2.2, 3);
    expect(floor30.ratioSAvgRelic).toBeCloseTo(4.095 / (2.2 * 3), 3);
  });

  it("uses the new difficulty demand multipliers for normal enemies", () => {
    const expected = [
      ["explorer", 0.3, 1.26],
      ["standard", 0.65, 2.73],
      ["advanced", 1, 4.2],
      ["master", 1.45, 6.09],
      ["void", 2.1, 8.82],
    ] as const;

    for (const [difficulty, multiplier, demand] of expected) {
      const stats = calculateEnemyStats({ floor: 30, difficultyId: difficulty, enemyRole: "normal" });
      const previewRow = getBalancePreviewRows(difficulty).find((row) => row.floor === 30);
      expect(stats.baseDemand).toBeCloseTo(4.2, 2);
      expect(stats.enemyDemand).toBeCloseTo(demand, 2);
      expect(previewRow?.difficultyMultiplier).toBe(multiplier);
      expect(previewRow?.relicAvgPower).toBeCloseTo(3, 3);
    }
  });

  it("matches the adjusted floor 30 final boss ratio targets", () => {
    const standard = getBalancePreviewRows("standard").find((row) => row.floor === 30);
    const advanced = getBalancePreviewRows("advanced").find((row) => row.floor === 30);
    const master = getBalancePreviewRows("master").find((row) => row.floor === 30);
    const voidRow = getBalancePreviewRows("void").find((row) => row.floor === 30);
    if (!standard || !advanced || !master || !voidRow) throw new Error("Expected floor 30 preview rows");

    expect(standard.enemyDemand).toBeCloseTo(4.095, 3);
    expect(standard.ratioBAvgRelic).toBeCloseTo(1.365, 3);
    expect(standard.ratioAAvgRelic).toBeCloseTo(0.975, 3);
    expect(standard.ratioSAvgRelic).toBeCloseTo(0.62, 3);

    expect(advanced.enemyDemand).toBeCloseTo(6.3, 3);
    expect(advanced.ratioSAvgRelic).toBeCloseTo(0.955, 3);

    expect(master.enemyDemand).toBeCloseTo(9.135, 3);
    expect(master.ratioSSAvgRelic).toBeCloseTo(0.87, 3);
    expect(master.ratioUAvgRelic).toBeCloseTo(0.609, 3);

    expect(voidRow.enemyDemand).toBeCloseTo(13.23, 3);
    expect(voidRow.ratioXAvgRelic).toBeCloseTo(0.63, 3);
  });

  it("keeps standard final boss HP in the target duration range", () => {
    const floor30 = getBalancePreviewRows("standard").find((row) => row.floor === 30);
    if (!floor30) throw new Error("Expected floor 30 preview row");

    expect(floor30.role).toBe("finalBoss");
    expect(floor30.maxHp).toBeGreaterThanOrEqual(1200);
    expect(floor30.maxHp).toBeLessThanOrEqual(1400);
    expect(floor30.hpToBaseHpRatio).toBeGreaterThanOrEqual(2);
    expect(floor30.hpToBaseHpRatio).toBeLessThanOrEqual(2.2);
    expect(floor30.estimatedTimeB).toBeGreaterThanOrEqual(240);
    expect(floor30.estimatedTimeB).toBeLessThanOrEqual(280);
    expect(floor30.estimatedTimeA).toBeGreaterThanOrEqual(170);
    expect(floor30.estimatedTimeA).toBeLessThanOrEqual(200);
    expect(floor30.estimatedTimeS).toBeGreaterThanOrEqual(110);
    expect(floor30.estimatedTimeS).toBeLessThanOrEqual(130);
  });

  it("returns a preview wrapper and logs with console.table", () => {
    const table = vi.spyOn(console, "table").mockImplementation(() => undefined);

    expect(generateBalancePreview("standard").rows).toHaveLength(30);
    expect(logBalancePreview("standard")).toHaveLength(30);
    expect(table).toHaveBeenCalledOnce();

    table.mockRestore();
  });

  it("guards invalid debug values", () => {
    expect(safeNumber(Number.NaN, 10, 1)).toBe(10);
    expect(safeNumber(Infinity, 10, 1)).toBe(10);
    expect(safeNumber(-5, 10, 1)).toBe(10);
    expect(safeRatio(Number.NaN, 0.5)).toBe(0.5);
    expect(safeText("", "fallback")).toBe("fallback");
  });
});
