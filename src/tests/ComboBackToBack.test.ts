import { describe, expect, it } from "vitest";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { ResolveLineClearUseCase } from "../application/ResolveLineClearUseCase";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import type { GameAppState } from "../application/GameAppState";

describe("Combo and back-to-back", () => {
  it("increases combo on consecutive line clears", () => {
    const random = new SeededRandomProvider(11);
    const started = durableCombat(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()));
    const first = new ResolveLineClearUseCase(random).execute(started, 1);
    const second = new ResolveLineClearUseCase(random).execute(first, 1);

    expect(first.combat?.player.combo).toBe(1);
    expect(second.combat?.player.combo).toBe(2);
  });

  it("resets combo when no line is cleared", () => {
    const random = new SeededRandomProvider(12);
    const started = durableCombat(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()));
    const clear = new ResolveLineClearUseCase(random).execute(started, 1);
    const miss = new ResolveLineClearUseCase(random).execute(clear, 0);

    expect(miss.combat?.player.combo).toBe(0);
  });

  it("keeps back-to-back through consecutive tetrises", () => {
    const random = new SeededRandomProvider(13);
    const started = durableCombat(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()));
    const first = new ResolveLineClearUseCase(random).execute(started, 4);
    const second = new ResolveLineClearUseCase(random).execute(first, 4);

    expect(first.combat?.player.backToBackActive).toBe(true);
    expect(second.combat?.player.backToBackActive).toBe(true);
  });

  it("breaks back-to-back after a normal line clear", () => {
    const random = new SeededRandomProvider(14);
    const started = durableCombat(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()));
    const tetris = new ResolveLineClearUseCase(random).execute(started, 4);
    const single = new ResolveLineClearUseCase(random).execute(tetris, 1);

    expect(single.combat?.player.backToBackActive).toBe(false);
  });
});

function durableCombat(state: GameAppState): GameAppState {
  if (!state.combat) return state;
  return {
    ...state,
    combat: {
      ...state.combat,
      enemy: { ...state.combat.enemy, hp: 99, definition: { ...state.combat.enemy.definition, maxHp: 99 } },
    },
  };
}
