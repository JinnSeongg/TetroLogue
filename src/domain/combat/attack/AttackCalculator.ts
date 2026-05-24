import { attackTypeFor, createBaseAttackResult } from "./AttackResultFactory";
import { AttackTable } from "./AttackTable";
import { B2BPolicy } from "./B2BPolicy";
import { ComboTable } from "./ComboTable";
import { PerfectClearBonusTable } from "./PerfectClearBonusTable";
import type { AttackCalculationInput, AttackResult } from "./AttackTypes";

export class AttackCalculator {
  constructor(
    private readonly attackTable = new AttackTable(),
    private readonly comboTable = new ComboTable(),
    private readonly b2bPolicy = new B2BPolicy(),
    private readonly perfectClearBonusTable = new PerfectClearBonusTable(),
  ) {}

  calculate(input: AttackCalculationInput): AttackResult {
    const attackType = attackTypeFor(input.lineClearCount, input.spinResult, input.isPerfectClear);
    const baseDamage = this.attackTable.damageFor(attackType, input.lineClearCount, input.spinResult.grade);
    const comboAfter = this.comboTable.nextCount(input.lineClearCount, input.comboBefore);
    const comboBonus = this.comboTable.bonusFor(input.lineClearCount, comboAfter);
    const isB2BEligible = this.b2bPolicy.isEligible(attackType, input.lineClearCount, input.spinResult);
    const b2bBonus = this.b2bPolicy.bonusFor(baseDamage, isB2BEligible, input.wasB2BActive);
    const b2bAfter = this.b2bPolicy.nextActive(input.lineClearCount, isB2BEligible, input.wasB2BActive);
    const perfectClearBonus = this.perfectClearBonusTable.bonusFor(input.isPerfectClear, input.lineClearCount);

    return createBaseAttackResult({
      lineClearCount: input.lineClearCount,
      spinResult: input.spinResult,
      isPerfectClear: input.isPerfectClear,
      baseDamage,
      comboBonus,
      b2bBonus,
      perfectClearBonus,
      comboBefore: input.comboBefore,
      comboAfter,
      wasB2BActive: input.wasB2BActive,
      isB2BEligible,
      b2bAfter,
    });
  }
}
