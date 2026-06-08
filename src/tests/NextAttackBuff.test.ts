import { describe, expect, it } from "vitest";
import { ResolveLineClearUseCase } from "../application/ResolveLineClearUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import type { GameAppState } from "../application/GameAppState";
import { noSpinResult, type SpinResult } from "../domain/tetris/SpinDetector";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import type { AttackResult } from "../domain/combat/AttackTypes";

describe("next attack buffs", () => {
  it("starts combat with no next attack buffs", () => {
    const state = startCombatWithRelics(120);

    expect(state.combat?.player.nextAttackBuffs).toEqual([]);
  });

  it("creates a Tetris follow-up buff after the attack and applies it to the next attack only", () => {
    const random = new SeededRandomProvider(121);
    const started = startCombatWithRelics(121, ["tetris_followup_power"]);

    const tetris = new ResolveLineClearUseCase(random).execute(started, 4);
    const followup = new ResolveLineClearUseCase(random).execute(tetris, 1);
    const consumed = new ResolveLineClearUseCase(random).execute(followup, 1);

    expect(lastAttackResult(tetris)?.totalDamage).toBe(4);
    expect(tetris.combat?.player.nextAttackBuffs).toEqual([{ sourceRelicId: "tetris_followup_power", flatBonusAdd: 2 }]);
    expect(lastAttackResult(followup)?.flatBonus).toBe(2);
    expect(lastAttackResult(followup)?.totalDamage).toBe(3);
    expect(followup.combat?.player.nextAttackBuffs).toEqual([]);
    expect(lastAttackResult(consumed)?.flatBonus).toBe(0);
  });

  it("creates a T-spin follow-up buff and applies it to the next attack", () => {
    const random = new SeededRandomProvider(122);
    const started = startCombatWithRelics(122, ["tspin_followup_power"]);

    const tSpin = new ResolveLineClearUseCase(random).execute(started, 2, tSpinResult());
    const followup = new ResolveLineClearUseCase(random).execute(tSpin, 1);

    expect(tSpin.combat?.player.nextAttackBuffs).toEqual([{ sourceRelicId: "tspin_followup_power", flatBonusAdd: 2 }]);
    expect(lastAttackResult(followup)?.flatBonus).toBe(2);
    expect(lastAttackResult(followup)?.totalDamage).toBe(3);
    expect(followup.combat?.player.nextAttackBuffs).toEqual([]);
  });

  it("creates a Perfect Clear follow-up buff and applies +3 to the next attack", () => {
    const random = new SeededRandomProvider(123);
    const started = startCombatWithRelics(123, ["pc_followup_bonus"]);

    const pc = new ResolveLineClearUseCase(random).execute(started, 4, noSpinResult(), true);
    const followup = new ResolveLineClearUseCase(random).execute(pc, 1);

    expect(pc.combat?.player.nextAttackBuffs).toEqual([{ sourceRelicId: "pc_followup_bonus", flatBonusAdd: 3 }]);
    expect(lastAttackResult(followup)?.flatBonus).toBe(3);
    expect(lastAttackResult(followup)?.totalDamage).toBe(4);
    expect(followup.combat?.player.nextAttackBuffs).toEqual([]);
  });

  it("does not consume a pending next attack buff on a non-clear lock", () => {
    const random = new SeededRandomProvider(124);
    const started = withNextAttackBuffs(startCombatWithRelics(124), [{ sourceRelicId: "tetris_followup_power", flatBonusAdd: 2 }]);

    const miss = new ResolveLineClearUseCase(random).execute(started, 0);
    const followup = new ResolveLineClearUseCase(random).execute(miss, 1);

    expect(lastAttackResult(miss)?.flatBonus).toBe(0);
    expect(lastAttackResult(miss)?.totalDamage).toBe(0);
    expect(miss.combat?.player.nextAttackBuffs).toEqual([{ sourceRelicId: "tetris_followup_power", flatBonusAdd: 2 }]);
    expect(lastAttackResult(followup)?.flatBonus).toBe(2);
    expect(lastAttackResult(followup)?.totalDamage).toBe(2);
    expect(followup.combat?.player.nextAttackBuffs).toEqual([]);
  });

  it("does not apply all-attack flat bonuses or create follow-up buffs on a non-clear lock", () => {
    const random = new SeededRandomProvider(127);
    const started = startCombatWithRelics(127, ["no_hold_focus", "tetris_followup_power"]);
    const enemyHp = started.combat?.enemy.hp;

    const miss = new ResolveLineClearUseCase(random).execute(started, 0);
    const result = lastAttackResult(miss);

    expect(result?.flatBonus).toBe(0);
    expect(result?.totalDamage).toBe(0);
    expect(result?.appliedRelicIds).toEqual([]);
    expect(miss.combat?.enemy.hp).toBe(enemyHp);
    expect(miss.combat?.player.nextAttackBuffs).toEqual([]);
  });

  it("applies all-attack flat bonuses when a line clear attacks", () => {
    const random = new SeededRandomProvider(128);
    const started = startCombatWithRelics(128, ["no_hold_focus"]);

    const single = new ResolveLineClearUseCase(random).execute(started, 1);
    const result = lastAttackResult(single);

    expect(result?.flatBonus).toBe(2);
    expect(result?.totalDamage).toBe(2);
    expect(result?.appliedRelicIds).toContain("no_hold_focus");
  });

  it("keeps one buff per source relic when the same follow-up relic triggers again", () => {
    const random = new SeededRandomProvider(125);
    const started = startCombatWithRelics(125, ["tetris_followup_power"]);

    const first = new ResolveLineClearUseCase(random).execute(started, 4);
    const second = new ResolveLineClearUseCase(random).execute(first, 4);

    expect(first.combat?.player.nextAttackBuffs).toHaveLength(1);
    expect(lastAttackResult(second)?.flatBonus).toBe(2);
    expect(second.combat?.player.nextAttackBuffs).toEqual([{ sourceRelicId: "tetris_followup_power", flatBonusAdd: 2 }]);
  });

  it("stacks follow-up buffs from different source relics", () => {
    const random = new SeededRandomProvider(126);
    const started = startCombatWithRelics(126, ["tetris_followup_power", "pc_followup_bonus"]);

    const pcTetris = new ResolveLineClearUseCase(random).execute(started, 4, noSpinResult(), true);
    const followup = new ResolveLineClearUseCase(random).execute(pcTetris, 1);

    expect(pcTetris.combat?.player.nextAttackBuffs).toEqual([
      { sourceRelicId: "tetris_followup_power", flatBonusAdd: 2 },
      { sourceRelicId: "pc_followup_bonus", flatBonusAdd: 3 },
    ]);
    expect(lastAttackResult(followup)?.flatBonus).toBe(5);
    expect(lastAttackResult(followup)?.totalDamage).toBe(6);
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

function withNextAttackBuffs(state: GameAppState, nextAttackBuffs: NonNullable<GameAppState["combat"]>["player"]["nextAttackBuffs"]): GameAppState {
  if (!state.combat) return state;
  return { ...state, combat: { ...state.combat, player: { ...state.combat.player, nextAttackBuffs } } };
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
