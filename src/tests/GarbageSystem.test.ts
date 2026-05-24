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
    const state = withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 1, 1);

    const next = new ResolveLineClearUseCase(random).execute(state, 0);
    const bottom = next.combat?.player.board.snapshot()[19] ?? [];

    expect(bottom.filter((cell) => cell.filled)).toHaveLength(9);
    expect(next.events.some((event) => event.type === "GarbageApplied")).toBe(true);
  });

  it("defeats the player when garbage overflows the board", () => {
    const random = new SeededRandomProvider(42);
    const state = withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 1, 1);
    const fullTopBoard = state.combat!.player.board.withFilledRow(0);
    const overflowState = {
      ...state,
      combat: { ...state.combat!, player: { ...state.combat!.player, board: fullTopBoard } },
    };

    const next = new ResolveLineClearUseCase(random).execute(overflowState, 0);

    expect(next.scene).toBe("runResult");
    expect(next.runResult?.result).toBe("defeat");
  });

  it("cancels pending garbage before any remaining damage reaches the enemy", () => {
    const random = new SeededRandomProvider(43);
    const state = withDurableEnemy(withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 4, 99));
    const enemyHp = state.combat?.enemy.hp ?? 0;

    const next = new ResolveLineClearUseCase(random).execute(state, 4);

    expect(next.combat?.enemy.pendingGarbage).toBe(0);
    expect(next.combat?.enemy.hp).toBe(enemyHp);
    expect(next.events.some((event) => event.type === "GarbageCanceled")).toBe(true);
  });

  it("reduces pending garbage and deals no damage when attack is too small", () => {
    const random = new SeededRandomProvider(44);
    const state = withDurableEnemy(withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 4, 99));
    const enemyHp = state.combat?.enemy.hp ?? 0;

    const next = new ResolveLineClearUseCase(random).execute(state, 1);

    expect(next.combat?.enemy.pendingGarbage).toBe(4);
    expect(next.combat?.enemy.hp).toBe(enemyHp);
  });

  it("decreases garbage delay even on locks with no line clear", () => {
    const random = new SeededRandomProvider(45);
    const state = withPendingGarbage(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), 1, 2);

    const next = new ResolveLineClearUseCase(random).execute(state, 0);

    expect(next.combat?.enemy.garbageQueue.getPackets()).toEqual([
      { id: "garbage_1", amount: 1, source: "test_intent", remainingDelay: 1 },
    ]);
    expect(next.events.some((event) => event.type === "GarbageApplied")).toBe(false);
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
      enemy: { ...state.combat.enemy, hp: 99, definition: { ...state.combat.enemy.definition, maxHp: 99 } },
    },
  };
}

function withPendingGarbage(state: GameAppState, pendingGarbage: number, dueActionCount: number): GameAppState {
  if (!state.combat) return state;
  return {
    ...state,
    combat: {
      ...state.combat,
      enemy: {
        ...state.combat.enemy,
        pendingGarbage,
        garbageQueue: new GarbageQueue(
          { defaultDelay: dueActionCount },
          [{ id: "garbage_1", amount: pendingGarbage, source: "test_intent", remainingDelay: dueActionCount }],
        ),
        currentIntent: {
          id: "test_intent",
          description: "Test garbage",
          dueActionCount,
          garbageLines: pendingGarbage,
        },
      },
    },
  };
}
