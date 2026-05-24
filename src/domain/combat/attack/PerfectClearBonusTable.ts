export type PerfectClearBonusTableDefinition = {
  lineClearBonus: number;
};

export const defaultPerfectClearBonusTableDefinition: PerfectClearBonusTableDefinition = {
  lineClearBonus: 6,
};

export class PerfectClearBonusTable {
  constructor(private readonly definition: PerfectClearBonusTableDefinition = defaultPerfectClearBonusTableDefinition) {}

  bonusFor(isPerfectClear: boolean, lineClearCount: number): number {
    if (!isPerfectClear || lineClearCount <= 0) return 0;
    return this.definition.lineClearBonus;
  }
}
