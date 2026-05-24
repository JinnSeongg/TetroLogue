import type { ComboState } from "./AttackTypes";

export type ComboBonusBand = {
  min: number;
  max?: number;
  bonus: number;
};

export const defaultComboBonusBands: ComboBonusBand[] = [
  { min: 0, max: 1, bonus: 0 },
  { min: 2, max: 3, bonus: 1 },
  { min: 4, max: 5, bonus: 2 },
  { min: 6, bonus: 3 },
];

export class ComboTable {
  constructor(private readonly bands: ComboBonusBand[] = defaultComboBonusBands) {}

  nextState(lineClearCount: number, comboState: ComboState): ComboState {
    if (lineClearCount <= 0) return { count: 0 };
    return { count: comboState.count + 1 };
  }

  bonusFor(comboCount: number): number {
    return this.bands.find((band) => comboCount >= band.min && (band.max === undefined || comboCount <= band.max))?.bonus ?? 0;
  }
}
