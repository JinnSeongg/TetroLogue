import type { RandomProvider } from "../shared/RandomProvider";
import type { TetrominoType } from "./Cell";

export const sevenBagPieces: TetrominoType[] = ["I", "O", "T", "J", "L", "S", "Z"];

export class PieceQueue {
  private queue: TetrominoType[];

  constructor(
    private readonly random: RandomProvider,
    initialQueue: TetrominoType[] = [],
  ) {
    this.queue = [...initialQueue];
    this.ensureQueueSize(sevenBagPieces.length);
  }

  next(): TetrominoType {
    return this.popNext();
  }

  popNext(): TetrominoType {
    this.ensureQueueSize(1);
    const piece = this.queue.shift();
    if (!piece) throw new Error("Piece queue is empty");
    this.ensureQueueSize(sevenBagPieces.length);
    return piece;
  }

  peek(count: number): TetrominoType[] {
    return this.peekNext(count);
  }

  peekNext(count: number): TetrominoType[] {
    this.ensureQueueSize(Math.max(0, count));
    return this.queue.slice(0, count);
  }

  snapshot(): TetrominoType[] {
    return [...this.queue];
  }

  ensureQueueSize(size: number): void {
    while (this.queue.length < size) this.queue.push(...this.createShuffledBag());
  }

  createShuffledBag(): TetrominoType[] {
    return this.random.shuffle([...sevenBagPieces]);
  }
}
