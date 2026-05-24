export type GarbagePlan = {
  pendingLines: number;
};

import type { RandomProvider } from "../shared/RandomProvider";
import type { Board } from "../tetris/Board";
import { garbageConfig, type GarbageApplyConfig } from "./GarbageConfig";
import { GarbageHoleGenerator } from "./GarbageHoleGenerator";

export class GarbageSystem {
  createPending(lines: number): GarbagePlan {
    return { pendingLines: lines };
  }

  insert(board: Board, lines: number, random: RandomProvider, config: GarbageApplyConfig = {}): { board: Board; overflow: boolean; holeX: number; holes: number[] } {
    const generator = new GarbageHoleGenerator(config.holePattern ?? garbageConfig.defaultHolePattern, random);
    return this.insertWithGenerator(board, lines, generator);
  }

  insertWithGenerator(board: Board, lines: number, generator: GarbageHoleGenerator): { board: Board; overflow: boolean; holeX: number; holes: number[] } {
    if (lines <= 0) return { board, overflow: false, holeX: 0, holes: [] };

    let nextBoard = board;
    let overflow = false;
    const holes: number[] = [];

    for (let line = 0; line < lines; line += 1) {
      const holeX = generator.nextHole(board.width);
      const result = nextBoard.insertGarbageLines(1, holeX);
      nextBoard = result.board;
      overflow = overflow || result.overflow;
      holes.push(holeX);
    }

    return { board: nextBoard, overflow, holeX: holes[0] ?? 0, holes };
  }
}
