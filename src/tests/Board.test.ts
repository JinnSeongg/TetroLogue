import { describe, expect, it } from "vitest";
import { Board } from "../domain/tetris/Board";

describe("Board", () => {
  it("creates an empty 10x20 board", () => {
    const board = Board.create(10, 20);

    expect(board.width).toBe(10);
    expect(board.height).toBe(20);
    expect(board.snapshot().flat().every((cell) => !cell.filled)).toBe(true);
  });
});
