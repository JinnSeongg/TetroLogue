export type ComboBonusBand = {
  min: number;
  max?: number;
  bonus: number;
};

export const defaultComboBonusBands: ComboBonusBand[] = [
  { min: 0, max: 1, bonus: 0 },
  { min: 2, max: 3, bonus: 1 },
  { min: 4, max: 5, bonus: 2 },
  { min: 6, max: 8, bonus: 3 },
  { min: 9, bonus: 4 },
];

export class ComboTable {
  constructor(private readonly bands: ComboBonusBand[] = defaultComboBonusBands) {}

  nextCount(lineClearCount: number, comboBefore: number): number {
    if (lineClearCount <= 0) return 0;
    return Math.max(0, comboBefore) + 1;
  }

  bonusFor(lineClearCount: number, comboAfter: number): number {
    if (lineClearCount <= 0) return 0;
    return this.bands.find((band) => comboAfter >= band.min && (band.max === undefined || comboAfter <= band.max))?.bonus ?? 0;
  }
}
