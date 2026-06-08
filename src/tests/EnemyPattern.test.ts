import { describe, expect, it } from "vitest";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { TickCombatUseCase } from "../application/TickCombatUseCase";
import { DamageResolver } from "../domain/combat/DamageResolver";
import { enemyDefinitions } from "../data/enemyDefinitions";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import { calculateGarbageIntervalMs } from "../domain/combat/garbage/GarbageScaling";

describe("Enemy pattern", () => {
  it("queues enemy garbage on the configured time interval", () => {
    const random = new SeededRandomProvider(15);
    const run = new StartRunUseCase(new SeededRandomProvider(15)).execute();
    const floor2 = {
      ...run,
      run: run.run
        ? {
            ...run.run,
            currentNodeId: "floor_2",
            progress: { ...run.run.progress, currentFloor: 2 },
          }
        : run.run,
    };
    const started = new StartCombatUseCase(random).execute(floor2);
    const calculatedStats = started.combat?.enemy.calculatedStats;
    if (!calculatedStats) throw new Error("Expected calculated enemy stats");
    const next = new TickCombatUseCase(random).execute(started, 5000);

    expect(next.combat?.enemy.garbageQueue.getPendingLines()).toBe(calculatedStats.garbageLines);
    expect(next.combat?.enemy.garbageQueue.getReadyLines()).toBe(0);
  });

  it("applies defense rules for a specific attack type", () => {
    const damage = new DamageResolver().resolve(enemyDefinitions.enemy_line_guard, 3, 1);

    expect(damage).toBe(2);
  });

  it("stores a floor and difficulty scaled runtime garbage pattern at combat start", () => {
    const random = new SeededRandomProvider(16);
    const run = new StartRunUseCase(new SeededRandomProvider(16)).execute();
    if (!run.run) throw new Error("Expected run");
    const floor30Hard = {
      ...run,
      run: {
        ...run.run,
        difficultyId: "hard" as const,
        progress: { ...run.run.progress, currentFloor: 30 },
      },
    };

    const started = new StartCombatUseCase(random).execute(floor30Hard);

    expect(started.combat?.enemy.garbagePattern).toMatchObject({
      type: "fixedInterval",
      lines: 4,
      intervalMs: calculateGarbageIntervalMs(32, 4),
      travelDelayMs: 2500,
      initialDelayMs: 5000,
    });
  });
});
