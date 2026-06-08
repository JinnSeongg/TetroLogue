import { describe, expect, it } from "vitest";
import { ResolveLineClearUseCase } from "../application/ResolveLineClearUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import type { GameAppState } from "../application/GameAppState";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { LocalStorageSaveRepository } from "../infrastructure/LocalStorageSaveRepository";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import type { AttackResult } from "../domain/combat/AttackTypes";
import type { SpinResult } from "../domain/tetris/SpinDetector";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("consecutive attack counts", () => {
  it("starts combat with zero consecutive Tetris and T-spin counts", () => {
    const state = startCombatWithRelics(301);

    expect(state.combat?.player.consecutiveTetrisCount).toBe(0);
    expect(state.combat?.player.consecutiveTSpinCount).toBe(0);
  });

  it("applies consecutive_tetris_power on the second consecutive Tetris", () => {
    const random = new SeededRandomProvider(302);
    const started = startCombatWithRelics(302, ["consecutive_tetris_power"]);

    const first = new ResolveLineClearUseCase(random).execute(started, 4);
    const second = new ResolveLineClearUseCase(random).execute(first, 4);

    expect(first.combat?.player.consecutiveTetrisCount).toBe(1);
    expect(first.combat?.player.consecutiveTSpinCount).toBe(0);
    expect(lastAttackResult(first)?.appliedRelicIds).not.toContain("consecutive_tetris_power");
    expect(second.combat?.player.consecutiveTetrisCount).toBe(2);
    expect(lastAttackResult(second)?.typeBonus).toBe(0.25);
    expect(lastAttackResult(second)?.appliedRelicIds).toContain("consecutive_tetris_power");
  });

  it("resets Tetris count and starts T-spin count when a T-spin follows Tetris", () => {
    const random = new SeededRandomProvider(303);
    const started = startCombatWithRelics(303);

    const tetris = new ResolveLineClearUseCase(random).execute(started, 4);
    const tSpin = new ResolveLineClearUseCase(random).execute(tetris, 2, tSpinResult());

    expect(tetris.combat?.player.consecutiveTetrisCount).toBe(1);
    expect(tSpin.combat?.player.consecutiveTetrisCount).toBe(0);
    expect(tSpin.combat?.player.consecutiveTSpinCount).toBe(1);
  });

  it("applies consecutive T-spin relics on the second and third consecutive T-spin", () => {
    const random = new SeededRandomProvider(304);
    const started = startCombatWithRelics(304, ["consecutive_tspin_power", "consecutive_tspin_flat"]);

    const first = new ResolveLineClearUseCase(random).execute(started, 2, tSpinResult());
    const second = new ResolveLineClearUseCase(random).execute(first, 2, tSpinResult());
    const third = new ResolveLineClearUseCase(random).execute(second, 2, tSpinResult());

    expect(first.combat?.player.consecutiveTSpinCount).toBe(1);
    expect(lastAttackResult(first)?.appliedRelicIds).not.toContain("consecutive_tspin_power");
    expect(second.combat?.player.consecutiveTSpinCount).toBe(2);
    expect(lastAttackResult(second)?.typeBonus).toBe(0.25);
    expect(lastAttackResult(second)?.appliedRelicIds).toContain("consecutive_tspin_power");
    expect(lastAttackResult(second)?.appliedRelicIds).not.toContain("consecutive_tspin_flat");
    expect(third.combat?.player.consecutiveTSpinCount).toBe(3);
    expect(lastAttackResult(third)?.flatBonus).toBe(2);
    expect(lastAttackResult(third)?.appliedRelicIds).toContain("consecutive_tspin_flat");
  });

  it("resets both counts on normal line clears and no-clear locks", () => {
    const random = new SeededRandomProvider(305);
    const started = startCombatWithRelics(305);

    const tetris = new ResolveLineClearUseCase(random).execute(started, 4);
    const single = new ResolveLineClearUseCase(random).execute(tetris, 1);
    const tSpin = new ResolveLineClearUseCase(random).execute(single, 2, tSpinResult());
    const miss = new ResolveLineClearUseCase(random).execute(tSpin, 0);

    expect(single.combat?.player.consecutiveTetrisCount).toBe(0);
    expect(single.combat?.player.consecutiveTSpinCount).toBe(0);
    expect(tSpin.combat?.player.consecutiveTSpinCount).toBe(1);
    expect(miss.combat?.player.consecutiveTetrisCount).toBe(0);
    expect(miss.combat?.player.consecutiveTSpinCount).toBe(0);
  });

  it("saves and loads consecutive counts", () => {
    const random = new SeededRandomProvider(306);
    const storage = new MemoryStorage();
    const repository = new LocalStorageSaveRepository("consecutive", storage);
    const started = startCombatWithRelics(306);
    const tetris = new ResolveLineClearUseCase(random).execute(started, 4);

    repository.save(tetris);
    const loaded = repository.load();

    expect(loaded?.combat?.player.consecutiveTetrisCount).toBe(1);
    expect(loaded?.combat?.player.consecutiveTSpinCount).toBe(0);
  });
});

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
