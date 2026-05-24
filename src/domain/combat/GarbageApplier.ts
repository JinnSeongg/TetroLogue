import type { RandomProvider } from "../shared/RandomProvider";
import type { Board } from "../tetris/Board";
import type { GarbagePacket } from "./GarbageQueue";
import { garbageConfig, type GarbageApplyConfig } from "./GarbageConfig";
import { GarbageHoleGenerator } from "./GarbageHoleGenerator";
import { GarbageSystem } from "./GarbageSystem";

export type GarbageApplyResult = {
  board: Board;
  overflow: boolean;
  appliedLines: number;
  holes: number[];
};

export class GarbageApplier {
  apply(board: Board, packets: GarbagePacket[], random: RandomProvider, config: GarbageApplyConfig = {}): GarbageApplyResult {
    let nextBoard = board;
    let overflow = false;
    let appliedLines = 0;
    const holes: number[] = [];
    const garbageSystem = new GarbageSystem();
    const holeGenerator = new GarbageHoleGenerator(config.holePattern ?? garbageConfig.defaultHolePattern, random);

    for (const packet of packets) {
      if (packet.amount <= 0) continue;
      const result = garbageSystem.insertWithGenerator(nextBoard, packet.amount, holeGenerator);
      nextBoard = result.board;
      overflow = overflow || result.overflow;
      appliedLines += packet.amount;
      holes.push(...result.holes);
    }

    return { board: nextBoard, overflow, appliedLines, holes };
  }
}
