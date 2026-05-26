import { describe, expect, it } from "vitest";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { ResolveLineClearUseCase } from "../application/ResolveLineClearUseCase";
import { DamageResolver } from "../domain/combat/DamageResolver";
import { enemyDefinitions } from "../data/enemyDefinitions";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

describe("Enemy pattern", () => {
  it("creates an enemy intent on the configured action interval", () => {
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
    let next = started;
    for (let index = 0; index < calculatedStats.intentEveryActions; index += 1) {
      next = new ResolveLineClearUseCase(random).execute(next, 0);
    }

    expect(next.combat?.enemy.currentIntent?.garbageLines).toBe(calculatedStats.garbageLines);
    expect(next.combat?.enemy.currentIntent?.dueActionCount).toBe(
      calculatedStats.intentEveryActions + calculatedStats.garbageDelayActions,
    );
    expect(next.combat?.log.some((event) => event.type === "EnemyIntentChanged")).toBe(true);
  });

  it("applies defense rules for a specific attack type", () => {
    const damage = new DamageResolver().resolve(enemyDefinitions.enemy_line_guard, 3, 1);

    expect(damage).toBe(2);
  });
});
