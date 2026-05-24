import { describe, expect, it } from "vitest";
import { HandlePlayerInputUseCase } from "../application/HandlePlayerInputUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

describe("lock delay reset", () => {
  it("resets lock timer when movement succeeds", () => {
    const random = new SeededRandomProvider(70);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    const combat = state.combat;
    if (!combat?.player.activePiece) throw new Error("Expected active piece");
    const primed = {
      ...state,
      combat: {
        ...combat,
        player: {
          ...combat.player,
          activePiece: combat.player.activePiece.move(-1, 0),
          lockElapsedMs: 300,
        },
      },
    };

    const moved = new HandlePlayerInputUseCase(random).execute(primed, "moveRight");

    expect(moved.combat?.player.lockElapsedMs).toBe(0);
  });
});
