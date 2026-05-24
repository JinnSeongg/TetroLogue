import type { SpinGrade } from "../../tetris/SpinDetector";
import type { AttackType } from "./AttackTypes";

type LineDamageTable = Partial<Record<0 | 1 | 2 | 3 | 4, number>>;

export type AttackTableDefinition = {
  lineClear: LineDamageTable;
  tSpin: {
    mini: LineDamageTable;
    full: LineDamageTable;
  };
  allSpin: LineDamageTable;
};

export const defaultAttackTableDefinition: AttackTableDefinition = {
  lineClear: {
    0: 0,
    1: 0,
    2: 1,
    3: 2,
    4: 4,
  },
  tSpin: {
    mini: {
      0: 0,
      1: 1,
    },
    full: {
      0: 0,
      1: 2,
      2: 4,
      3: 6,
    },
  },
  allSpin: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
  },
};

export class AttackTable {
  constructor(private readonly definition: AttackTableDefinition = defaultAttackTableDefinition) {}

  damageFor(attackType: AttackType, lineClearCount: number, spinGrade: SpinGrade): number {
    const lineKey = this.lineKey(lineClearCount);
    if (lineKey === 0) return 0;
    if (attackType === "TSpin") {
      const table = spinGrade === "Mini" ? this.definition.tSpin.mini : this.definition.tSpin.full;
      return table[lineKey] ?? 0;
    }
    if (attackType === "AllSpin") return this.definition.allSpin[lineKey] ?? 0;
    if (attackType === "LineClear") return this.definition.lineClear[lineKey] ?? 0;
    return 0;
  }

  private lineKey(lineClearCount: number): 0 | 1 | 2 | 3 | 4 {
    return Math.min(Math.max(lineClearCount, 0), 4) as 0 | 1 | 2 | 3 | 4;
  }
}
