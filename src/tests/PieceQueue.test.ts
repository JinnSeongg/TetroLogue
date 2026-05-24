import { describe, expect, it, vi } from "vitest";
import { HandlePlayerInputUseCase } from "../application/HandlePlayerInputUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { PieceQueue, sevenBagPieces } from "../domain/tetris/PieceQueue";
import type { TetrominoType } from "../domain/tetris/Cell";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

const countPieces = (pieces: TetrominoType[]) =>
  pieces.reduce<Record<TetrominoType, number>>(
    (counts, piece) => ({ ...counts, [piece]: counts[piece] + 1 }),
    { I: 0, O: 0, T: 0, J: 0, L: 0, S: 0, Z: 0 },
  );

const expectSevenBag = (pieces: TetrominoType[]) => {
  expect(pieces).toHaveLength(7);
  expect(countPieces(pieces)).toEqual({ I: 1, O: 1, T: 1, J: 1, L: 1, S: 1, Z: 1 });
};

describe("PieceQueue", () => {
  it("pops all seven piece types exactly once in the first bag", () => {
    const queue = new PieceQueue(new SeededRandomProvider(1));

    expectSevenBag(Array.from({ length: 7 }, () => queue.popNext()));
  });

  it("starts a new bag on the eighth pop", () => {
    const queue = new PieceQueue(new SeededRandomProvider(2));
    const firstBag = Array.from({ length: 7 }, () => queue.popNext());
    const eighth = queue.popNext();

    expectSevenBag(firstBag);
    expect(sevenBagPieces).toContain(eighth);
  });

  it("keeps each bag complete across fourteen pops", () => {
    const queue = new PieceQueue(new SeededRandomProvider(3));
    const pieces = Array.from({ length: 14 }, () => queue.popNext());

    expectSevenBag(pieces.slice(0, 7));
    expectSevenBag(pieces.slice(7, 14));
  });

  it("uses seedable RandomProvider order", () => {
    const firstQueue = new PieceQueue(new SeededRandomProvider(4));
    const sameSeedQueue = new PieceQueue(new SeededRandomProvider(4));
    const differentSeedQueue = new PieceQueue(new SeededRandomProvider(5));
    const first = Array.from({ length: 14 }, () => firstQueue.popNext());
    const sameSeed = Array.from({ length: 14 }, () => sameSeedQueue.popNext());
    const differentSeed = Array.from({ length: 14 }, () => differentSeedQueue.popNext());

    expect(first).toEqual(sameSeed);
    expect(first).not.toEqual(differentSeed);
  });

  it("does not consume pieces when peeking", () => {
    const queue = new PieceQueue(new SeededRandomProvider(6));
    const preview = queue.peekNext(5);

    expect(queue.peekNext(5)).toEqual(preview);
    expect(Array.from({ length: 5 }, () => queue.popNext())).toEqual(preview);
  });

  it("shifts preview by one after popNext", () => {
    const queue = new PieceQueue(new SeededRandomProvider(7));
    const preview = queue.peekNext(5);

    queue.popNext();

    expect(queue.peekNext(4)).toEqual(preview.slice(1));
  });

  it("can preview the ruleset next count and supports zero preview", () => {
    const queue = new PieceQueue(new SeededRandomProvider(8));

    expect(queue.peekNext(standardRuleSet.nextPreviewCount)).toHaveLength(standardRuleSet.nextPreviewCount);
    expect(queue.peekNext(0)).toEqual([]);
  });

  it("does not call Math.random directly", () => {
    const randomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random should not be used by PieceQueue");
    });

    const queue = new PieceQueue(new SeededRandomProvider(9));
    const pieces = Array.from({ length: 14 }, () => queue.popNext());

    expect(pieces).toHaveLength(14);
    randomSpy.mockRestore();
  });

  it("empty hold consumes one queued piece without changing the seven-bag order otherwise", () => {
    const random = new SeededRandomProvider(10);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    if (!state.combat?.player.activePiece) throw new Error("Expected active piece");
    const current = state.combat?.player.activePiece?.type;
    const firstQueued = state.combat?.player.pieceQueue[0];
    const queueAfterFirst = state.combat?.player.pieceQueue.slice(1);

    const held = new HandlePlayerInputUseCase(random).execute(state, "hold");

    expect(held.combat?.player.hold).toBe(current);
    expect(held.combat?.player.activePiece?.type).toBe(firstQueued);
    expect(held.combat?.player.pieceQueue.slice(0, queueAfterFirst.length)).toEqual(queueAfterFirst);
  });

  it("hold swap does not pop from the queue", () => {
    const random = new SeededRandomProvider(11);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    const held = new HandlePlayerInputUseCase(random).execute(state, "hold");
    const locked = new HandlePlayerInputUseCase(random).execute(held, "hardDrop");
    const queueBeforeSwap = locked.combat?.player.pieceQueue;
    const previewBeforeSwap = locked.combat?.player.nextPieces;
    const holdBeforeSwap = locked.combat?.player.hold;
    const activeBeforeSwap = locked.combat?.player.activePiece?.type;

    const swapped = new HandlePlayerInputUseCase(random).execute(locked, "hold");

    expect(swapped.combat?.player.activePiece?.type).toBe(holdBeforeSwap);
    expect(swapped.combat?.player.hold).toBe(activeBeforeSwap);
    expect(swapped.combat?.player.pieceQueue).toEqual(queueBeforeSwap);
    expect(swapped.combat?.player.nextPieces).toEqual(previewBeforeSwap);
  });
});
