import type { TetrominoType } from "./Cell";

export class HoldSlot {
  constructor(
    public readonly held?: TetrominoType,
    public readonly usedThisTurn = false,
  ) {}

  hold(current: TetrominoType): { slot: HoldSlot; swapped?: TetrominoType } {
    if (this.usedThisTurn) return { slot: this };
    return {
      slot: new HoldSlot(current, true),
      swapped: this.held,
    };
  }

  resetTurn(): HoldSlot {
    return new HoldSlot(this.held, false);
  }
}
