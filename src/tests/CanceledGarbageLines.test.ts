import { describe, expect, it } from "vitest";
import { ResolveLineClearUseCase } from "../application/ResolveLineClearUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import type { GameAppState } from "../application/GameAppState";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { GarbageQueue } from "../domain/combat/GarbageQueue";
import type { AttackResult } from "../domain/combat/AttackTypes";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import type { SpinResult } from "../domain/tetris/SpinDetector";

describe("canceled garbage lines", () => {
  it("uses the actual cancelled queue lines as canceledGarbageLines", () => {
    const random = new SeededRandomProvider(401);

    const partial = new ResolveLineClearUseCase(random).execute(startCombat(401, [], 3), 3);
    const overflow = new ResolveLineClearUseCase(random).execute(startCombat(402, [], 1), 4);
    const none = new ResolveLineClearUseCase(random).execute(startCombat(403, [], 0), 4);

    expect(canceledLines(partial)).toBe(2);
    expect(partial.combat?.enemy.pendingGarbage).toBe(1);
    expect(canceledLines(overflow)).toBe(1);
    expect(overflow.combat?.enemy.pendingGarbage).toBe(0);
    expect(canceledLines(none)).toBe(0);
  });

  it("applies Tetris cancel bonus only when Tetris cancels garbage", () => {
    const random = new SeededRandomProvider(404);
    const active = new ResolveLineClearUseCase(random).execute(startCombat(404, ["tetris_cancel_bonus"], 5), 4);
    const inactive = new ResolveLineClearUseCase(random).execute(startCombat(405, ["tetris_cancel_bonus"], 0), 4);

    expect(lastAttackResult(active)?.counterBonus).toBe(1);
    expect(lastAttackResult(active)?.appliedRelicIds).toContain("tetris_cancel_bonus");
    expect(lastAttackResult(inactive)?.counterBonus).toBe(0);
    expect(lastAttackResult(inactive)?.appliedRelicIds).not.toContain("tetris_cancel_bonus");
  });

  it("applies T-spin cancel bonus only when T-spin cancels garbage", () => {
    const random = new SeededRandomProvider(406);
    const active = new ResolveLineClearUseCase(random).execute(startCombat(406, ["tspin_cancel_bonus"], 3), 2, tSpinResult());
    const inactive = new ResolveLineClearUseCase(random).execute(startCombat(407, ["tspin_cancel_bonus"], 0), 2, tSpinResult());

    expect(lastAttackResult(active)?.counterBonus).toBe(1);
    expect(lastAttackResult(active)?.appliedRelicIds).toContain("tspin_cancel_bonus");
    expect(lastAttackResult(inactive)?.counterBonus).toBe(0);
    expect(lastAttackResult(inactive)?.appliedRelicIds).not.toContain("tspin_cancel_bonus");
  });

  it("applies B2B cancel bonus only when B2B attack cancels garbage", () => {
    const random = new SeededRandomProvider(408);
    const active = new ResolveLineClearUseCase(random).execute(withB2B(startCombat(408, ["b2b_cancel_bonus"], 5)), 4);
    const inactive = new ResolveLineClearUseCase(random).execute(startCombat(409, ["b2b_cancel_bonus"], 5), 4);

    expect(lastAttackResult(active)?.b2bDamage).toBe(2);
    expect(lastAttackResult(active)?.appliedRelicIds).toContain("b2b_cancel_bonus");
    expect(lastAttackResult(inactive)?.b2bDamage).toBe(0);
    expect(lastAttackResult(inactive)?.appliedRelicIds).not.toContain("b2b_cancel_bonus");
  });

  it("applies stable field cancel bonus only on a stable field that cancels garbage", () => {
    const random = new SeededRandomProvider(410);
    const active = new ResolveLineClearUseCase(random).execute(startCombat(410, ["stable_field_cancel_bonus_1"], 5), 4);
    const inactive = new ResolveLineClearUseCase(random).execute(startCombat(411, ["stable_field_cancel_bonus_1"], 0), 4);

    expect(lastAttackResult(active)?.counterBonus).toBe(1);
    expect(lastAttackResult(active)?.appliedRelicIds).toContain("stable_field_cancel_bonus_1");
    expect(lastAttackResult(inactive)?.counterBonus).toBe(0);
    expect(lastAttackResult(inactive)?.appliedRelicIds).not.toContain("stable_field_cancel_bonus_1");
  });

  it("does not use counterBonus to cancel additional pending garbage", () => {
    const random = new SeededRandomProvider(412);
    const state = startCombat(412, ["tetris_cancel_bonus"], 5);
    const enemyHp = state.combat?.enemy.hp ?? 0;

    const next = new ResolveLineClearUseCase(random).execute(state, 4);

    expect(canceledLines(next)).toBe(4);
    expect(next.combat?.enemy.pendingGarbage).toBe(1);
    expect(lastAttackResult(next)?.counterBonus).toBe(1);
    expect(next.combat?.enemy.hp).toBe(enemyHp - 1);
  });
});

function startCombat(seed: number, relicIds: string[] = [], pendingGarbage = 0): GameAppState {
  const run = new StartRunUseCase().execute();
  const withRelics = run.run
    ? {
        ...run,
        run: {
          ...run.run,
          relicInventory: relicIds.reduce((inventory, relicId) => inventory.add(relicId), run.run.relicInventory),
        },
      }
    : run;
  return withPendingGarbage(durableCombat(new StartCombatUseCase(new SeededRandomProvider(seed)).execute(withRelics)), pendingGarbage);
}

function durableCombat(state: GameAppState): GameAppState {
  if (!state.combat) return state;
  return {
    ...state,
    combat: {
      ...state.combat,
      enemy: { ...state.combat.enemy, hp: 999, maxHp: 999, definition: { ...state.combat.enemy.definition, maxHp: 999 } },
    },
  };
}

function withPendingGarbage(state: GameAppState, pendingGarbage: number): GameAppState {
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
          pendingGarbage > 0 ? [{ id: "garbage_1", amount: pendingGarbage, source: "test_intent", createdAtMs: 1000, readyAtMs: 3500 }] : [],
        ),
      },
    },
  };
}

function withB2B(state: GameAppState): GameAppState {
  if (!state.combat) return state;
  return {
    ...state,
    combat: {
      ...state.combat,
      player: { ...state.combat.player, backToBackActive: true, backToBackCount: 1 },
    },
  };
}

function canceledLines(state: GameAppState): number {
  return [...state.events].reverse().find((event) => event.type === "GarbageCanceled")?.canceledLines ?? 0;
}

function lastAttackResult(state: GameAppState): AttackResult | undefined {
  return [...state.events].reverse().find((event) => event.type === "AttackCalculated")?.attackResult;
}

function tSpinResult(): SpinResult {
  return {
    kind: "TSpin",
    grade: "Full",
    pieceType: "T",
    method: "TCorner",
    rotationState: "0",
    kickIndex: 0,
  };
}
