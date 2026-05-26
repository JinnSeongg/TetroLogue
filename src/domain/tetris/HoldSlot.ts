import type { TetrominoType } from "./Cell";

const defaultMaxHoldSlots = 1;
const maximumHoldSlots = 2;

export class HoldSlot {
  public readonly holdSlots: TetrominoType[];
  public readonly maxHoldSlots: number;
  public readonly hasHeldThisPiece: boolean;

  constructor(held?: TetrominoType, usedThisTurn = false, maxHoldSlots = defaultMaxHoldSlots, holdSlots?: TetrominoType[]) {
    this.maxHoldSlots = normalizeMaxHoldSlots(maxHoldSlots);
    this.holdSlots = normalizeHoldSlots(holdSlots ?? (held ? [held] : []), this.maxHoldSlots);
    this.hasHeldThisPiece = usedThisTurn;
  }

  get held(): TetrominoType | undefined {
    return this.holdSlots[0];
  }

  get usedThisTurn(): boolean {
    return this.hasHeldThisPiece;
  }

  hold(current: TetrominoType): { slot: HoldSlot; swapped?: TetrominoType } {
    if (this.hasHeldThisPiece) return { slot: this };
    if (this.holdSlots.length === 0) {
      return { slot: new HoldSlot(undefined, true, this.maxHoldSlots, [current]) };
    }
    if (this.maxHoldSlots === 1 || this.holdSlots.length === 1) {
      return { slot: new HoldSlot(undefined, true, this.maxHoldSlots, [current]), swapped: this.holdSlots[0] };
    }
    const [hold1, hold2] = this.holdSlots;
    return { slot: new HoldSlot(undefined, true, this.maxHoldSlots, [current, hold1]), swapped: hold2 };
  }

  resetTurn(maxHoldSlots = this.maxHoldSlots): HoldSlot {
    return new HoldSlot(undefined, false, maxHoldSlots, this.holdSlots);
  }

  withMaxSlots(maxHoldSlots: number): HoldSlot {
    return new HoldSlot(undefined, this.hasHeldThisPiece, maxHoldSlots, this.holdSlots);
  }
}

export function normalizeMaxHoldSlots(maxHoldSlots: number | undefined): number {
  if (!Number.isFinite(maxHoldSlots)) return defaultMaxHoldSlots;
  return Math.min(maximumHoldSlots, Math.max(defaultMaxHoldSlots, Math.round(maxHoldSlots ?? defaultMaxHoldSlots)));
}

function normalizeHoldSlots(holdSlots: TetrominoType[], maxHoldSlots: number): TetrominoType[] {
  return holdSlots.filter(Boolean).slice(0, normalizeMaxHoldSlots(maxHoldSlots));
}
