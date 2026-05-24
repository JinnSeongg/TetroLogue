import { describe, expect, it } from "vitest";
import { HandlePlayerInputUseCase } from "../application/HandlePlayerInputUseCase";
import { ProcessBufferedInputUseCase } from "../application/ProcessBufferedInputUseCase";
import { createInputBuffer, enqueueInput } from "../application/input/InputBuffer";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { TickCombatUseCase } from "../application/TickCombatUseCase";
import { Board } from "../domain/tetris/Board";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import type { GameAppState } from "../application/GameAppState";

const lockRuleSet = { ...standardRuleSet, gravityMs: 100, softDropGravityMs: 20, lockDelayMs: 80, maxLockResets: 2 };

const startState = (seed: number): GameAppState => new StartCombatUseCase(new SeededRandomProvider(seed)).execute(new StartRunUseCase().execute());

const groundedState = (seed: number, piece = new ActivePiece("I", { x: 4, y: 19 })): GameAppState => {
  const state = startState(seed);
  if (!state.combat) throw new Error("Expected combat");
  return {
    ...state,
    combat: {
      ...state.combat,
      player: {
        ...state.combat.player,
        board: Board.create(10, 20),
        activePiece: piece,
        isGrounded: true,
        groundedSinceMs: 0,
        lockElapsedMs: 60,
        lockResetCount: 0,
        lastLockResetAtMs: undefined,
      },
    },
  };
};

describe("lock reset limit", () => {
  it("starts a new active piece with zero lock resets", () => {
    const state = startState(120);

    expect(state.combat?.player.lockResetCount).toBe(0);
  });

  it("marks a piece as grounded when it cannot fall", () => {
    const random = new SeededRandomProvider(121);
    const state = groundedState(121);

    const ticked = new TickCombatUseCase(random, lockRuleSet).execute(state, 10, false, 100);

    expect(ticked.combat?.player.isGrounded).toBe(true);
    expect(ticked.combat?.player.groundedSinceMs).toBe(0);
    expect(ticked.combat?.player.lockElapsedMs).toBe(70);
  });

  it("resets lock timer and increments count when grounded movement succeeds", () => {
    const random = new SeededRandomProvider(122);
    const state = groundedState(122);

    const moved = new HandlePlayerInputUseCase(random, lockRuleSet).executeWithResult(state, "moveLeft", 100);

    expect(moved.executed).toBe(true);
    expect(moved.state.combat?.player.lockElapsedMs).toBe(0);
    expect(moved.state.combat?.player.lockResetCount).toBe(1);
    expect(moved.state.combat?.player.lastLockResetAtMs).toBe(100);
  });

  it("resets lock timer and increments count when grounded rotation succeeds", () => {
    const random = new SeededRandomProvider(123);
    const state = groundedState(123, new ActivePiece("T", { x: 4, y: 19 }));

    const rotated = new HandlePlayerInputUseCase(random, lockRuleSet).executeWithResult(state, "rotateClockwise", 120);

    expect(rotated.executed).toBe(true);
    expect(rotated.state.combat?.player.lockElapsedMs).toBe(0);
    expect(rotated.state.combat?.player.lockResetCount).toBe(1);
  });

  it("does not increment reset count when movement fails", () => {
    const random = new SeededRandomProvider(124);
    const state = groundedState(124, new ActivePiece("I", { x: 1, y: 19 }));

    const failed = new HandlePlayerInputUseCase(random, lockRuleSet).executeWithResult(state, "moveLeft", 100);

    expect(failed.executed).toBe(false);
    expect(failed.state.combat?.player.lockResetCount).toBe(0);
    expect(failed.state.combat?.player.lockElapsedMs).toBe(60);
  });

  it("does not increment reset count for soft drop ticks", () => {
    const random = new SeededRandomProvider(125);
    const state = groundedState(125);

    const ticked = new TickCombatUseCase(random, lockRuleSet).execute(state, 10, true, 100);

    expect(ticked.combat?.player.lockResetCount).toBe(0);
    expect(ticked.combat?.player.lockElapsedMs).toBe(70);
  });

  it("hardDrop locks immediately without using lock reset", () => {
    const random = new SeededRandomProvider(126);
    const state = groundedState(126);

    const dropped = new HandlePlayerInputUseCase(random, lockRuleSet).executeWithResult(state, "hardDrop", 100);

    expect(dropped.executed).toBe(true);
    expect(dropped.state.events.some((event) => event.type === "PiecePlaced")).toBe(true);
    expect(dropped.state.combat?.player.lockResetCount).toBe(0);
  });

  it("does not reset lock timer after maxLockResets is reached", () => {
    const random = new SeededRandomProvider(127);
    const state = groundedState(127);
    const maxed = {
      ...state,
      combat: {
        ...state.combat!,
        player: {
          ...state.combat!.player,
          lockResetCount: lockRuleSet.maxLockResets,
          lockElapsedMs: 70,
        },
      },
    };

    const moved = new HandlePlayerInputUseCase(random, lockRuleSet).executeWithResult(maxed, "moveLeft", 200);

    expect(moved.executed).toBe(true);
    expect(moved.state.combat?.player.activePiece?.position.x).toBe(3);
    expect(moved.state.combat?.player.lockResetCount).toBe(lockRuleSet.maxLockResets);
    expect(moved.state.combat?.player.lockElapsedMs).toBe(70);
    expect(moved.state.events.some((event) => event.type === "LockResetLimitReached")).toBe(true);
  });

  it("locks after lockDelayMs even when reset limit has been reached", () => {
    const random = new SeededRandomProvider(128);
    const state = groundedState(128);
    const maxed = {
      ...state,
      combat: {
        ...state.combat!,
        player: {
          ...state.combat!.player,
          lockResetCount: lockRuleSet.maxLockResets,
          lockElapsedMs: 70,
        },
      },
    };

    const moved = new HandlePlayerInputUseCase(random, lockRuleSet).executeWithResult(maxed, "moveLeft", 200).state;
    const ticked = new TickCombatUseCase(random, lockRuleSet).execute(moved, 10, false, 210);

    expect(ticked.events.some((event) => event.type === "PiecePlaced")).toBe(true);
  });

  it("counts buffered rotation as a lock reset", () => {
    const random = new SeededRandomProvider(129);
    const state = {
      ...groundedState(129, new ActivePiece("T", { x: 4, y: 19 })),
      inputBuffer: enqueueInput(createInputBuffer(), "rotateClockwise", 0),
    };

    const processed = new ProcessBufferedInputUseCase(random, lockRuleSet).execute(state, 50);

    expect(processed.combat?.player.lockResetCount).toBe(1);
    expect(processed.combat?.player.lockElapsedMs).toBe(0);
  });

  it("resets count when the next active piece spawns", () => {
    const random = new SeededRandomProvider(130);
    const state = groundedState(130);
    const primed = {
      ...state,
      combat: {
        ...state.combat!,
        player: { ...state.combat!.player, lockResetCount: 2, lastLockResetAtMs: 100 },
      },
    };

    const dropped = new HandlePlayerInputUseCase(random, lockRuleSet).executeWithResult(primed, "hardDrop", 200).state;

    expect(dropped.combat?.player.lockResetCount).toBe(0);
    expect(dropped.combat?.player.lastLockResetAtMs).toBeUndefined();
  });
});
