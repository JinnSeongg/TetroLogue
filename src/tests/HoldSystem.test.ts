import { describe, expect, it } from "vitest";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { HandlePlayerInputUseCase } from "../application/HandlePlayerInputUseCase";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";

describe("Hold system", () => {
  it("holds the current piece and spawns the next piece on first hold", () => {
    const random = new SeededRandomProvider(7);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    const current = state.combat?.player.activePiece?.type;
    const next = state.combat?.player.nextPieces[0];

    const held = new HandlePlayerInputUseCase(random).execute(state, "hold");

    expect(held.combat?.player.hold).toBe(current);
    expect(held.combat?.player.activePiece?.type).toBe(next);
    expect(held.combat?.player.holdSlot.usedThisTurn).toBe(true);
  });

  it("does not hold twice before the piece locks", () => {
    const random = new SeededRandomProvider(8);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    const held = new HandlePlayerInputUseCase(random).execute(state, "hold");
    const activeAfterFirstHold = held.combat?.player.activePiece?.type;

    const secondHold = new HandlePlayerInputUseCase(random).execute(held, "hold");

    expect(secondHold.combat?.player.activePiece?.type).toBe(activeAfterFirstHold);
    expect(secondHold.combat?.player.hold).toBe(held.combat?.player.hold);
  });

  it("allows holding again after a piece locks", () => {
    const random = new SeededRandomProvider(9);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    const held = new HandlePlayerInputUseCase(random).execute(state, "hold");

    const locked = new HandlePlayerInputUseCase(random).execute(held, "hardDrop");

    expect(locked.combat?.player.holdSlot.usedThisTurn).toBe(false);
  });

  it("ignores hold when the ruleset disables it", () => {
    const random = new SeededRandomProvider(10);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    const current = state.combat?.player.activePiece?.type;

    const afterHold = new HandlePlayerInputUseCase(random, { ...standardRuleSet, holdEnabled: false }).execute(state, "hold");

    expect(afterHold.combat?.player.hold).toBeUndefined();
    expect(afterHold.combat?.player.activePiece?.type).toBe(current);
  });
});
