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
    const action1 = new ResolveLineClearUseCase(random).execute(started, 0);
    const action2 = new ResolveLineClearUseCase(random).execute(action1, 0);
    const action3 = new ResolveLineClearUseCase(random).execute(action2, 0);
    const action4 = new ResolveLineClearUseCase(random).execute(action3, 0);
    const action5 = new ResolveLineClearUseCase(random).execute(action4, 0);

    expect(action5.combat?.enemy.currentIntent?.garbageLines).toBe(1);
    expect(action5.combat?.log.some((event) => event.type === "EnemyIntentChanged")).toBe(true);
  });

  it("applies defense rules for a specific attack type", () => {
    const damage = new DamageResolver().resolve(enemyDefinitions.enemy_line_guard, 3, 1);

    expect(damage).toBe(2);
  });
});
