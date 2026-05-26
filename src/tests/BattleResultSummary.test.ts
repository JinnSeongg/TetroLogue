import { describe, expect, it } from "vitest";
import { ResolveLineClearUseCase } from "../application/ResolveLineClearUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import type { GameAppState } from "../application/GameAppState";
import { GarbageQueue } from "../domain/combat/GarbageQueue";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

describe("battle result summary", () => {
  it("records combat outcome metrics when a battle ends", () => {
    const random = new SeededRandomProvider(301);
    const started = new StartCombatUseCase(random).execute(new StartRunUseCase(random).execute("standard"));
    const state = withWeakEnemyAndPendingGarbage(started, 2);

    const result = new ResolveLineClearUseCase(random).execute(state, 4);
    const summary = result.combat?.lastBattleResultSummary;

    expect(summary).toMatchObject({
      floor: 1,
      difficultyId: "standard",
      result: "win",
      totalAttackBlockedByPendingGarbage: 2,
      totalGarbageCancelled: 2,
      totalDamageDealtToEnemy: 1,
      linesClearedTotal: 4,
    });
    expect(summary?.enemyId).toBeTruthy();
    expect(summary?.calculatedEnemyStats?.maxHp).toBeGreaterThan(0);
    expect(summary?.totalPlayerAttackGenerated).toBeGreaterThan(summary?.totalDamageDealtToEnemy ?? 0);
    expect(summary?.estimatedSurvivalTax).toBeGreaterThanOrEqual(2);
  });
});

function withWeakEnemyAndPendingGarbage(state: GameAppState, pendingGarbage: number): GameAppState {
  if (!state.combat) return state;
  return {
    ...state,
    combat: {
      ...state.combat,
      enemy: {
        ...state.combat.enemy,
        hp: 1,
        pendingGarbage,
        garbageQueue: new GarbageQueue(
          { defaultDelay: 0 },
          [{ id: "test_pending", amount: pendingGarbage, source: "test", remainingDelay: 99 }],
        ),
      },
    },
  };
}
