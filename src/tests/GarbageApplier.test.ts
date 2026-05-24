import { describe, expect, it } from "vitest";
import { GarbageApplier } from "../domain/combat/GarbageApplier";
import { Board } from "../domain/tetris/Board";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

describe("GarbageApplier", () => {
  it("applies ready packet amounts to the board with basic garbage holes", () => {
    const result = new GarbageApplier().apply(
      Board.create(),
      [{ id: "garbage_1", amount: 2, source: "enemy", remainingDelay: 0 }],
      new SeededRandomProvider(51),
    );

    const snapshot = result.board.snapshot();
    const garbageRows = snapshot.slice(18);

    expect(result.appliedLines).toBe(2);
    expect(result.holes).toHaveLength(2);
    expect(garbageRows.every((row) => row.filter((cell) => cell.filled).length === 9)).toBe(true);
  });

  it("uses the configured hole generator when applying garbage lines", () => {
    const result = new GarbageApplier().apply(
      Board.create(),
      [{ id: "garbage_1", amount: 2, source: "enemy", remainingDelay: 0 }],
      new SeededRandomProvider(52),
      { holePattern: { type: "Fixed", holeColumn: 4 } },
    );

    const garbageRows = result.board.snapshot().slice(18);

    expect(result.holes).toEqual([4, 4]);
    expect(garbageRows.every((row) => !row[4].filled)).toBe(true);
  });
});
