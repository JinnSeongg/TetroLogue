import { describe, expect, it } from "vitest";
import { ResolveLineClearUseCase } from "../application/ResolveLineClearUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { TickCombatUseCase } from "../application/TickCombatUseCase";
import type { GameAppState } from "../application/GameAppState";
import { noSpinResult } from "../domain/tetris/SpinDetector";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import type { AttackResult } from "../domain/combat/AttackTypes";
import type { TimedAttackBuff } from "../domain/combat/CombatState";
import { LocalStorageSaveRepository } from "../infrastructure/LocalStorageSaveRepository";

describe("timed attack buffs", () => {
  it("starts combat with no timed attack buffs", () => {
    const state = startCombatWithRelics(130);

    expect(state.combat?.player.timedAttackBuffs).toEqual([]);
  });

  it("creates a PC timed base power buff after the attack without applying it immediately", () => {
    const random = new SeededRandomProvider(131);
    const started = startCombatWithRelics(131, ["pc_timed_base_power"]);

    const pc = new ResolveLineClearUseCase(random).execute(started, 4, noSpinResult(), true);

    expect(lastAttackResult(pc)?.stateBonus).toBe(0);
    expect(pc.combat?.player.timedAttackBuffs).toEqual([
      { sourceRelicId: "pc_timed_base_power", remainingMs: 20000, stateBonusAdd: 0.2 },
    ]);
  });

  it("applies timed stateBonusAdd to base damage only on later attacks", () => {
    const random = new SeededRandomProvider(132);
    const started = withTimedAttackBuffs(startCombatWithRelics(132), [
      { sourceRelicId: "pc_timed_base_power", remainingMs: 20000, stateBonusAdd: 0.2 },
    ]);
    const comboB2BState = {
      ...started,
      combat: started.combat
        ? {
            ...started.combat,
            player: {
              ...started.combat.player,
              combo: 4,
              backToBackActive: true,
              backToBackCount: 3,
            },
          }
        : started.combat,
    };

    const attack = new ResolveLineClearUseCase(random).execute(comboB2BState, 4);
    const result = lastAttackResult(attack);

    expect(result?.stateBonus).toBe(0.2);
    expect(result?.baseAttack).toBe(4);
    expect(result?.baseScaledDamage).toBe(5);
    expect(result?.comboDamageMultiplier).toBe(1);
    expect(result?.b2bDamageMultiplier).toBe(1);
    expect(result?.perfectClearDamageMultiplier).toBe(1);
    expect(result?.flatBonus).toBe(0);
    expect(result?.counterBonus).toBe(0);
  });

  it("expires timed attack buffs after their remaining duration passes", () => {
    const random = new SeededRandomProvider(133);
    const started = withTimedAttackBuffs(startCombatWithRelics(133), [
      { sourceRelicId: "pc_timed_base_power", remainingMs: 20000, stateBonusAdd: 0.2 },
    ]);

    const beforeExpiry = new TickCombatUseCase(random).execute(started, 19999);
    const afterExpiry = new TickCombatUseCase(random).execute(beforeExpiry, 1);

    expect(beforeExpiry.combat?.player.timedAttackBuffs).toEqual([
      { sourceRelicId: "pc_timed_base_power", remainingMs: 1, stateBonusAdd: 0.2 },
    ]);
    expect(afterExpiry.combat?.player.timedAttackBuffs).toEqual([]);
  });

  it("refreshes duration for the same source relic when triggered again", () => {
    const random = new SeededRandomProvider(134);
    const started = withTimedAttackBuffs(startCombatWithRelics(134, ["pc_timed_base_power"]), [
      { sourceRelicId: "pc_timed_base_power", remainingMs: 1000, stateBonusAdd: 0.2 },
    ]);

    const refreshed = new ResolveLineClearUseCase(random).execute(started, 4, noSpinResult(), true);

    expect(refreshed.combat?.player.timedAttackBuffs).toEqual([
      { sourceRelicId: "pc_timed_base_power", remainingMs: 20000, stateBonusAdd: 0.2 },
    ]);
  });

  it("allows different timed buff sources to coexist", () => {
    const random = new SeededRandomProvider(135);
    const started = withTimedAttackBuffs(startCombatWithRelics(135), [
      { sourceRelicId: "pc_timed_base_power", remainingMs: 20000, stateBonusAdd: 0.2 },
      { sourceRelicId: "fixture_other_timed", remainingMs: 5000, stateBonusAdd: 0.1 },
    ]);

    const attack = new ResolveLineClearUseCase(random).execute(started, 4);

    expect(lastAttackResult(attack)?.stateBonus).toBe(0.30000000000000004);
    expect(attack.combat?.player.timedAttackBuffs).toHaveLength(2);
  });

  it("normalizes timed attack buffs during save and load", () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageSaveRepository("timed", storage);
    const state = withTimedAttackBuffs(startCombatWithRelics(136), [
      { sourceRelicId: "pc_timed_base_power", remainingMs: 12345.6, stateBonusAdd: 0.2 },
    ]);

    repository.save(state);
    const loaded = repository.load();

    expect(loaded?.combat?.player.timedAttackBuffs).toEqual([
      { sourceRelicId: "pc_timed_base_power", remainingMs: 12346, stateBonusAdd: 0.2 },
    ]);
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

function withTimedAttackBuffs(state: GameAppState, timedAttackBuffs: TimedAttackBuff[]): GameAppState {
  if (!state.combat) return state;
  return { ...state, combat: { ...state.combat, player: { ...state.combat.player, timedAttackBuffs } } };
}

function lastAttackResult(state: GameAppState): AttackResult | undefined {
  return [...state.events].reverse().find((event) => event.type === "AttackCalculated")?.attackResult;
}

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
