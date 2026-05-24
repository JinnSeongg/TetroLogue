import type { RandomProvider } from "../shared/RandomProvider";

export type GarbageHolePattern =
  | { type: "Fixed"; holeColumn: number }
  | { type: "Random" }
  | { type: "LimitedRandom"; changeChance: number; initialHoleColumn?: number };

export class GarbageHoleGenerator {
  private currentHole?: number;

  constructor(
    private readonly pattern: GarbageHolePattern,
    private readonly random: RandomProvider,
  ) {}

  nextHole(boardWidth: number): number {
    if (boardWidth <= 0) return 0;

    if (this.pattern.type === "Fixed") {
      this.currentHole = clampHole(this.pattern.holeColumn, boardWidth);
      return this.currentHole;
    }

    if (this.pattern.type === "Random") {
      this.currentHole = this.random.nextInt(boardWidth);
      return this.currentHole;
    }

    if (this.currentHole === undefined) {
      this.currentHole = this.pattern.initialHoleColumn === undefined ? this.random.nextInt(boardWidth) : clampHole(this.pattern.initialHoleColumn, boardWidth);
      return this.currentHole;
    }

    if (this.random.next() < this.pattern.changeChance) {
      this.currentHole = this.randomDifferentHole(boardWidth, this.currentHole);
    }

    return this.currentHole;
  }

  private randomDifferentHole(boardWidth: number, previousHole: number): number {
    if (boardWidth <= 1) return 0;

    const offset = this.random.nextInt(boardWidth - 1) + 1;
    return (previousHole + offset) % boardWidth;
  }
}

function clampHole(holeColumn: number, boardWidth: number): number {
  return Math.max(0, Math.min(boardWidth - 1, holeColumn));
}
