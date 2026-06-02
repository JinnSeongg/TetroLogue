import { describe, expect, it } from "vitest";
import { ResolveLineClearUseCase, calculateClearedHoleCount } from "../application/ResolveLineClearUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import type { GameAppState } from "../application/GameAppState";
import type { AttackResult } from "../domain/combat/AttackTypes";
import { FieldAnalyzer } from "../domain/combat/field-analysis/FieldAnalyzer";
import { Board } from "../domain/tetris/Board";
import type { Cell } from "../domain/tetris/Cell";
import { noSpinResult } from "../domain/tetris/SpinDetector";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

describe("clearedHoleCount", () => {
  it("calculates the positive holeCount delta across a line clear", () => {
    const before = boardFromRows(["....", ".XX.", "XXXX", "X..."]);
    const after = before.clearFullLines().board;

    expect(new FieldAnalyzer().analyze(before).holeCount).toBe(3);
    expect(new FieldAnalyzer().analyze(after).holeCount).toBe(2);
    expect(calculateClearedHoleCount(3, 2, 1)).toBe(1);
  });

  it("returns 0 when holeCount does not decrease", () => {
    expect(calculateClearedHoleCount(2, 3, 1)).toBe(0);
    expect(calculateClearedHoleCount(2, 2, 1)).toBe(0);
    expect(calculateClearedHoleCount(3, 2, 0)).toBe(0);
  });

  it("applies Hole 제거 피해 only when clearedHoleCount is at least 1", () => {
    const random = new SeededRandomProvider(221);
    const started = withBoard(startCombatWithRelics(221, ["hole_clear_damage"]), afterHoleClearBoard());

    const active = new ResolveLineClearUseCase(random).execute(started, 1, noSpinResult(), false, undefined, 0, undefined, beforeHoleClearBoard());
    const inactive = new ResolveLineClearUseCase(random).execute(started, 1);

    expect(lastAttackResult(active)?.flatBonus).toBe(1);
    expect(lastAttackResult(active)?.totalDamage).toBe(1);
    expect(lastAttackResult(inactive)?.flatBonus).toBe(0);
    expect(lastAttackResult(inactive)?.totalDamage).toBe(0);
  });

  it("creates Hole 정리 후속 추가타 after the attack and consumes it on the next attack", () => {
    const random = new SeededRandomProvider(222);
    const started = withBoard(startCombatWithRelics(222, ["hole_clear_followup"]), afterHoleClearBoard());

    const clear = new ResolveLineClearUseCase(random).execute(started, 1, noSpinResult(), false, undefined, 0, undefined, beforeHoleClearBoard());
    const followup = new ResolveLineClearUseCase(random).execute(clear, 1);

    expect(lastAttackResult(clear)?.flatBonus).toBe(0);
    expect(lastAttackResult(clear)?.totalDamage).toBe(0);
    expect(clear.combat?.player.nextAttackBuffs).toEqual([{ sourceRelicId: "hole_clear_followup", flatBonusAdd: 1 }]);
    expect(lastAttackResult(followup)?.flatBonus).toBe(1);
    expect(lastAttackResult(followup)?.totalDamage).toBe(2);
    expect(followup.combat?.player.nextAttackBuffs).toEqual([]);
  });

  it("applies 보스 Hole 제거 추가타 only for boss fights with cleared holes", () => {
    const random = new SeededRandomProvider(223);
    const normal = withBoard(startCombatWithRelics(223, ["boss_hole_clear_bonus"]), afterHoleClearBoard());
    const boss = withBoss(normal);

    const inactiveBoss = new ResolveLineClearUseCase(random).execute(normal, 1, noSpinResult(), false, undefined, 0, undefined, beforeHoleClearBoard());
    const inactiveHole = new ResolveLineClearUseCase(random).execute(boss, 1);
    const active = new ResolveLineClearUseCase(random).execute(boss, 1, noSpinResult(), false, undefined, 0, undefined, beforeHoleClearBoard());

    expect(lastAttackResult(inactiveBoss)?.totalDamage).toBe(0);
    expect(lastAttackResult(inactiveHole)?.totalDamage).toBe(0);
    expect(lastAttackResult(active)?.flatBonus).toBe(1);
    expect(lastAttackResult(active)?.totalDamage).toBe(1);
  });

  it("does not create hole follow-up buffs on a non-clear lock", () => {
    const random = new SeededRandomProvider(224);
    const started = withBoard(startCombatWithRelics(224, ["hole_clear_followup"]), afterHoleClearBoard());

    const miss = new ResolveLineClearUseCase(random).execute(started, 0, noSpinResult(), false, undefined, 0, undefined, beforeHoleClearBoard());

    expect(miss.combat?.player.nextAttackBuffs).toEqual([]);
  });
});

function beforeHoleClearBoard(): Board {
  return boardFromRows(["..........", ".XX.......", "XXXXXXXXXX", "X........."]);
}

function afterHoleClearBoard(): Board {
  return beforeHoleClearBoard().clearFullLines().board;
}

function boardFromRows(rows: string[]): Board {
  const width = rows[0]?.length ?? 0;
  const height = 20;
  const paddedRows = [...Array.from({ length: Math.max(0, height - rows.length) }, () => ".".repeat(width)), ...rows];
  return new Board(
    width,
    height,
    paddedRows.map((row) => [...row].map((value): Cell => (value === "X" ? { filled: true, pieceType: "I" } : { filled: false }))),
  );
}

function startCombatWithRelics(seed: number, relicIds: string[] = []): GameAppState {
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
  return durableCombat(new StartCombatUseCase(new SeededRandomProvider(seed)).execute(withRelics));
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

function withBoard(state: GameAppState, board: Board): GameAppState {
  if (!state.combat) return state;
  return { ...state, combat: { ...state.combat, player: { ...state.combat.player, board } } };
}

function withBoss(state: GameAppState): GameAppState {
  if (!state.combat) return state;
  return {
    ...state,
    combat: {
      ...state.combat,
      enemy: { ...state.combat.enemy, definition: { ...state.combat.enemy.definition, role: "boss" } },
    },
  };
}

function lastAttackResult(state: GameAppState): AttackResult | undefined {
  return [...state.events].reverse().find((event) => event.type === "AttackCalculated")?.attackResult;
}
