import { describe, expect, it } from "vitest";
import type { GameAppState } from "../application/GameAppState";
import { HandlePlayerInputUseCase } from "../application/HandlePlayerInputUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

describe("FastChain", () => {
  it("starts inactive at combat start", () => {
    const state = new StartCombatUseCase(new SeededRandomProvider(501)).execute(new StartRunUseCase().execute());

    expect(state.combat?.player.fastChainCount).toBe(0);
    expect(state.combat?.player.isFastState).toBe(false);
    expect(state.combat?.player.lastPieceLockTimeMs).toBeUndefined();
    expect(state.combat?.ruleSet.fastChainWindowMs).toBe(1000);
    expect(state.combat?.ruleSet.fastStateThreshold).toBe(3);
  });

  it("increments only on actual locks and enters fast state at the threshold", () => {
    const random = new SeededRandomProvider(502);
    let state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());

    state = lockCurrentPiece(state, random, 0);
    expect(state.combat?.player.fastChainCount).toBe(1);
    expect(state.combat?.player.isFastState).toBe(false);

    state = lockCurrentPiece(state, random, 1000);
    expect(state.combat?.player.fastChainCount).toBe(2);
    expect(state.combat?.player.isFastState).toBe(false);

    state = lockCurrentPiece(state, random, 1800);
    expect(state.combat?.player.fastChainCount).toBe(3);
    expect(state.combat?.player.isFastState).toBe(true);
    expect(state.events).toContainEqual({ type: "FastStateChanged", active: true, fastChainCount: 3 });
  });

  it("resets after the chain window and emits a fast state exit", () => {
    const random = new SeededRandomProvider(503);
    let state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());

    state = lockCurrentPiece(state, random, 0);
    state = lockCurrentPiece(state, random, 1000);
    state = lockCurrentPiece(state, random, 1800);
    state = lockCurrentPiece(state, random, 2801);

    expect(state.combat?.player.fastChainCount).toBe(1);
    expect(state.combat?.player.isFastState).toBe(false);
    expect(state.combat?.player.lastPieceLockTimeMs).toBe(2801);
    expect(state.events).toContainEqual({ type: "FastStateChanged", active: false, fastChainCount: 1 });
  });
});

function lockCurrentPiece(state: GameAppState, random: SeededRandomProvider, nowMs: number): GameAppState {
  if (!state.combat?.player.activePiece) throw new Error("Expected active piece");
  return new HandlePlayerInputUseCase(random, state.combat.ruleSet).execute(state, "hardDrop", nowMs);
}
