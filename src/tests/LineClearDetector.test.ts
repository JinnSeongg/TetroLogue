import { describe, expect, it } from "vitest";
import { Board } from "../domain/tetris/Board";
import { LineClearDetector } from "../domain/tetris/LineClearDetector";

describe("LineClearDetector", () => {
  it("clears full rows", () => {
    const board = Board.create(10, 20).withFilledRow(19);
    const result = new LineClearDetector().detectAndClear(board);

    expect(result.linesCleared).toBe(1);
    expect(result.board.snapshot()[19].every((cell) => !cell.filled)).toBe(true);
  });
});
