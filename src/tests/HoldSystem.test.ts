import { describe, expect, it } from "vitest";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { HandlePlayerInputUseCase } from "../application/HandlePlayerInputUseCase";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import { HoldSlot } from "../domain/tetris/HoldSlot";
import type { TetrominoType } from "../domain/tetris/Cell";

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

  it("enables two hold slots from the Twin Hold relic and keeps the default at one slot", () => {
    const random = new SeededRandomProvider(14);
    const baseRun = new StartRunUseCase().execute();
    const defaultCombat = new StartCombatUseCase(random).execute(baseRun);
    if (!baseRun.run) throw new Error("Expected run");

    const relicCombat = new StartCombatUseCase(random).execute({
      ...baseRun,
      run: { ...baseRun.run, relicInventory: baseRun.run.relicInventory.add("relic_twin_hold") },
    });

    expect(defaultCombat.combat?.ruleSet.maxHoldSlots).toBe(1);
    expect(defaultCombat.combat?.player.maxHoldSlots).toBe(1);
    expect(relicCombat.combat?.ruleSet.maxHoldSlots).toBe(2);
    expect(relicCombat.combat?.player.maxHoldSlots).toBe(2);
  });

  it("cycles two hold slots with the existing hold input when enabled", () => {
    const random = new SeededRandomProvider(11);
    const state = withHoldState(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), ["I", "Z"], false, 2, "T");

    const held = new HandlePlayerInputUseCase(random, { ...standardRuleSet, maxHoldSlots: 2 }).execute(state, "hold");

    expect(held.combat?.player.activePiece?.type).toBe("Z");
    expect(held.combat?.player.holdSlots).toEqual(["T", "I"]);
    expect(held.combat?.player.holdSlot.holdSlots).toEqual(["T", "I"]);
    expect(held.combat?.player.hasHeldThisPiece).toBe(true);
  });

  it("keeps the one-hold-per-piece limit with two hold slots", () => {
    const random = new SeededRandomProvider(12);
    const state = withHoldState(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), ["I", "Z"], false, 2, "T");
    const held = new HandlePlayerInputUseCase(random, { ...standardRuleSet, maxHoldSlots: 2 }).execute(state, "hold");

    const secondHold = new HandlePlayerInputUseCase(random, { ...standardRuleSet, maxHoldSlots: 2 }).execute(held, "hold");

    expect(secondHold.combat?.player.activePiece?.type).toBe("Z");
    expect(secondHold.combat?.player.holdSlots).toEqual(["T", "I"]);
  });

  it("drops Hold2 when the two-slot effect is disabled", () => {
    const random = new SeededRandomProvider(13);
    const state = withHoldState(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), ["I", "Z"], false, 2, "T");

    const held = new HandlePlayerInputUseCase(random, { ...standardRuleSet, maxHoldSlots: 1 }).execute(state, "hold");

    expect(held.combat?.player.activePiece?.type).toBe("I");
    expect(held.combat?.player.holdSlots).toEqual(["T"]);
    expect(held.combat?.player.maxHoldSlots).toBe(1);
  });
});

function withHoldState(
  state: ReturnType<StartCombatUseCase["execute"]>,
  holdSlots: TetrominoType[],
  hasHeldThisPiece: boolean,
  maxHoldSlots: number,
  activeType: TetrominoType,
) {
  if (!state.combat) throw new Error("Expected combat");
  const holdSlot = new HoldSlot(undefined, hasHeldThisPiece, maxHoldSlots, holdSlots);
  return {
    ...state,
    combat: {
      ...state.combat,
      ruleSet: { ...state.combat.ruleSet, maxHoldSlots },
      player: {
        ...state.combat.player,
        activePiece: new ActivePiece(activeType, { x: 4, y: 0 }),
        holdSlot,
        hold: holdSlot.held,
        holdSlots: holdSlot.holdSlots,
        maxHoldSlots: holdSlot.maxHoldSlots,
        hasHeldThisPiece: holdSlot.hasHeldThisPiece,
      },
    },
  };
}
