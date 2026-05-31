import { describe, expect, it } from "vitest";
import { ResolveLineClearUseCase } from "../application/ResolveLineClearUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import type { GameAppState } from "../application/GameAppState";
import { GarbageQueue } from "../domain/combat/GarbageQueue";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

describe("garbage pressure", () => {
  it("creates pending garbage when enemy intent is generated", () => {
    const random = new SeededRandomProvider(40);
    let state = withLineGuard(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()));

    state = new ResolveLineClearUseCase(random).execute(state, 0);
    state = new ResolveLineClearUseCase(random).execute(state, 0);
    state = new ResolveLineClearUseCase(random).execute(state, 0);

    expect(state.combat?.enemy.pendingGarbage).toBeGreaterThan(0);
    expect(state.combat?.enemy.garbageQueue.getTotalAmount()).toBeGreaterThan(0);
    expect(state.events.some((event) => event.type === "GarbagePending")).toBe(true);
  });

  it("inserts garbage and pushes existing rows up when due", () => {
    const random = new SeededRandomProvider(41);
    const state = withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 1, 3500);

    const next = new ResolveLineClearUseCase(random).execute(state, 0, undefined, undefined, undefined, 3500);
    const bottom = next.combat?.player.board.snapshot()[19] ?? [];

    expect(bottom.filter((cell) => cell.filled)).toHaveLength(9);
    expect(next.events.some((event) => event.type === "GarbageApplied")).toBe(true);
  });

  it("does not insert garbage before readyAtMs", () => {
    const random = new SeededRandomProvider(48);
    const state = withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 3, 3500);

    const next = new ResolveLineClearUseCase(random).execute(state, 0, undefined, undefined, undefined, 3000);

    expect(next.events.some((event) => event.type === "GarbageApplied")).toBe(false);
    expect(next.combat?.enemy.garbageQueue.getTotalAmount()).toBe(3);
  });

  it("does not insert pending garbage on a lock that clears lines", () => {
    const random = new SeededRandomProvider(46);
    const state = withDurableEnemy(withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 3, 1000));

    const next = new ResolveLineClearUseCase(random).execute(state, 1, undefined, undefined, undefined, 1000);
    const bottom = next.combat?.player.board.snapshot()[19] ?? [];

    expect(bottom.filter((cell) => cell.filled)).toHaveLength(0);
    expect(next.combat?.enemy.garbageQueue.getTotalAmount()).toBeGreaterThan(0);
    expect(next.events.some((event) => event.type === "GarbageApplied")).toBe(false);
  });

  it("applies at most four ready garbage lines on a non-clear lock", () => {
    const random = new SeededRandomProvider(47);
    const state = withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 10, 1000);

    const next = new ResolveLineClearUseCase(random).execute(state, 0, undefined, undefined, undefined, 1000);
    const garbageRows = next.combat?.player.board.snapshot().slice(16) ?? [];

    expect(garbageRows.every((row) => row.filter((cell) => cell.filled).length === 9)).toBe(true);
    expect(next.combat?.enemy.pendingGarbage).toBe(6);
    expect(next.combat?.enemy.garbageQueue.getTotalAmount()).toBe(6);
  });

  it("defeats the player when garbage overflows the board", () => {
    const random = new SeededRandomProvider(42);
    const state = withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 1, 1000);
    const fullTopBoard = state.combat!.player.board.withFilledRow(0);
    const overflowState = {
      ...state,
      combat: { ...state.combat!, player: { ...state.combat!.player, board: fullTopBoard } },
    };

    const next = new ResolveLineClearUseCase(random).execute(overflowState, 0, undefined, undefined, undefined, 1000);

    expect(next.scene).toBe("runResult");
    expect(next.runResult?.result).toBe("defeat");
  });

  it("cancels pending garbage before any remaining damage reaches the enemy", () => {
    const random = new SeededRandomProvider(43);
    const state = withDurableEnemy(withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 4, 3500));
    const enemyHp = state.combat?.enemy.hp ?? 0;

    const next = new ResolveLineClearUseCase(random).execute(state, 4);

    expect(next.combat?.enemy.pendingGarbage).toBe(0);
    expect(next.combat?.enemy.hp).toBe(enemyHp);
    expect(next.events.some((event) => event.type === "GarbageCanceled")).toBe(true);
  });

  it("reduces pending garbage and deals no damage when attack is too small", () => {
    const random = new SeededRandomProvider(44);
    const state = withDurableEnemy(withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 4, 3500));
    const enemyHp = state.combat?.enemy.hp ?? 0;

    const next = new ResolveLineClearUseCase(random).execute(state, 1);

    expect(next.combat?.enemy.pendingGarbage).toBe(4);
    expect(next.combat?.enemy.hp).toBe(enemyHp);
  });

});

function withLineGuard(state: GameAppState): GameAppState {
  if (!state.combat) return state;
  return {
    ...state,
    combat: {
      ...state.combat,
      enemy: {
        ...state.combat.enemy,
        calculatedStats: state.combat.enemy.calculatedStats
          ? { ...state.combat.enemy.calculatedStats, intentEveryActions: 3, garbageLines: 1, garbageDelayActions: 2 }
          : undefined,
        definition: {
          ...state.combat.enemy.definition,
          pattern: { ...state.combat.enemy.definition.pattern, intentEveryActions: 3, garbageLines: 1 },
        },
      },
    },
  };
}

function withDurableEnemy(state: GameAppState): GameAppState {
  if (!state.combat) return state;
  return {
    ...state,
    combat: {
      ...state.combat,
      enemy: { ...state.combat.enemy, hp: 99, maxHp: 99, definition: { ...state.combat.enemy.definition, maxHp: 99 } },
    },
  };
}

function withPendingGarbage(state: GameAppState, pendingGarbage: number, readyAtMs: number): GameAppState {
  if (!state.combat) return state;
  return {
    ...state,
    combat: {
      ...state.combat,
      enemy: {
        ...state.combat.enemy,
        pendingGarbage,
        garbageQueue: new GarbageQueue(
          { entryDelayMs: 2500 },
          [{ id: "garbage_1", amount: pendingGarbage, source: "test_intent", createdAtMs: 1000, readyAtMs }],
        ),
        currentIntent: {
          id: "test_intent",
          description: "Test garbage",
          dueActionCount: 0,
          garbageLines: pendingGarbage,
        },
      },
    },
  };
}
