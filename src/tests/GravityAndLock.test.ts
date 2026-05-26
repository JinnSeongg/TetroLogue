import { describe, expect, it } from "vitest";
import { HandlePlayerInputUseCase } from "../application/HandlePlayerInputUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { TickCombatUseCase } from "../application/TickCombatUseCase";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";

const fastRuleSet = { ...standardRuleSet, gravityMs: 100, softDropGravityMs: 20, lockDelayMs: 80 };

describe("gravity and lock delay", () => {
  it("moves the active piece down when gravity time passes", () => {
    const random = new SeededRandomProvider(30);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    const startY = state.combat?.player.activePiece?.position.y;

    const next = new TickCombatUseCase(random, fastRuleSet).execute(state, 100);

    expect(next.combat?.player.activePiece?.position.y).toBe((startY ?? 0) + 1);
  });

  it("locks the piece after touching ground for lockDelay", () => {
    const random = new SeededRandomProvider(31);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    const combat = state.combat;
    if (!combat?.player.activePiece) throw new Error("Expected active piece");
    let grounded = combat.player.activePiece;
    while (combat.player.board.canPlace(grounded.move(0, 1))) grounded = grounded.move(0, 1);
    const groundedState = { ...state, combat: { ...combat, player: { ...combat.player, activePiece: grounded } } };

    const next = new TickCombatUseCase(random, fastRuleSet).execute(groundedState, 80);

    expect(next.events.some((event) => event.type === "PiecePlaced")).toBe(true);
  });

  it("soft drop moves faster than normal gravity", () => {
    const random = new SeededRandomProvider(32);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    const normal = new TickCombatUseCase(random, fastRuleSet).execute(state, 20, 0);
    const soft = new TickCombatUseCase(random, fastRuleSet).execute(state, 20, 1);

    expect(normal.combat?.player.activePiece?.position.y).toBe(state.combat?.player.activePiece?.position.y);
    expect(soft.combat?.player.activePiece?.position.y).toBe((state.combat?.player.activePiece?.position.y ?? 0) + 1);
    expect(normal.events.some((event) => event.type === "PlayerActionSucceeded")).toBe(false);
    expect(soft.events.at(-1)).toEqual({ type: "PlayerActionSucceeded", action: "softDrop" });
  });

  it("moves multiple soft drop steps in one frame", () => {
    const random = new SeededRandomProvider(34);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());

    const next = new TickCombatUseCase(random, fastRuleSet).execute(state, 16, 3);

    expect(next.combat?.player.activePiece?.position.y).toBe((state.combat?.player.activePiece?.position.y ?? 0) + 3);
    expect(next.events.filter((event) => event.type === "PlayerActionSucceeded" && event.action === "softDrop")).toHaveLength(3);
  });

  it("does not spend normal gravity buildup as extra soft drop movement", () => {
    const random = new SeededRandomProvider(35);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    if (!state.combat?.player.activePiece) throw new Error("Expected active piece");
    const primedState = {
      ...state,
      combat: {
        ...state.combat,
        player: { ...state.combat.player, gravityElapsedMs: 90, softDropActive: false },
      },
    };

    const firstSoftTick = new TickCombatUseCase(random, fastRuleSet).execute(primedState, 1, 0);
    const secondSoftTick = new TickCombatUseCase(random, fastRuleSet).execute(firstSoftTick, 19, 1);

    expect(firstSoftTick.combat?.player.activePiece?.position.y).toBe(state.combat.player.activePiece.position.y);
    expect(firstSoftTick.combat?.player.gravityElapsedMs).toBe(91);
    expect(firstSoftTick.events.some((event) => event.type === "PlayerActionSucceeded")).toBe(false);
    expect(secondSoftTick.combat?.player.activePiece?.position.y).toBe(state.combat.player.activePiece.position.y + 1);
    expect(secondSoftTick.events.at(-1)).toEqual({ type: "PlayerActionSucceeded", action: "softDrop" });
  });

  it("hardDrop locks immediately", () => {
    const random = new SeededRandomProvider(33);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());

    const next = new HandlePlayerInputUseCase(random, fastRuleSet).execute(state, "hardDrop");

    expect(next.events.some((event) => event.type === "PiecePlaced")).toBe(true);
  });
});
