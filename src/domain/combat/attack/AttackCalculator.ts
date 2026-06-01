import { attackTypeFor, createBaseAttackResult } from "./AttackResultFactory";
import { AttackTable } from "./AttackTable";
import { B2BPolicy } from "./B2BPolicy";
import { ComboTable } from "./ComboTable";
import { PerfectClearBonusTable } from "./PerfectClearBonusTable";
import type { AttackCalculationInput, AttackResult } from "./AttackTypes";
import { DEFAULT_SPEED_BONUS_CAP, DEFAULT_SPEED_BONUS_PER_STACK } from "../../tetris/TetrisRuleSet";

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
    const b2bCount = input.b2bCount ?? (input.wasB2BActive ? 1 : 0);
    const b2bBonus = this.b2bPolicy.damageFor(baseDamage, isB2BEligible, b2bCount);
    const b2bAfter = this.b2bPolicy.nextActive(input.lineClearCount, isB2BEligible, input.wasB2BActive);
    const perfectClearBonus = this.perfectClearBonusTable.bonusFor(input.isPerfectClear, input.lineClearCount);

    return createBaseAttackResult({
      lineClearCount: input.lineClearCount,
      spinResult: input.spinResult,
      isPerfectClear: input.isPerfectClear,
      baseAttack: baseDamage,
      speedBonus: speedBonusFor(input.fastChain ?? 0, input.speedBonusPerStack, input.speedBonusCap),
      comboDamage: comboBonus,
      b2bDamage: b2bBonus,
      perfectClearDamage: perfectClearBonus,
      comboBefore: input.comboBefore,
      comboAfter,
      wasB2BActive: input.wasB2BActive,
      isB2BEligible,
      b2bCount,
      b2bAfter,
    });
  }
}

export function speedBonusFor(
  fastChain: number,
  speedBonusPerStack = DEFAULT_SPEED_BONUS_PER_STACK,
  speedBonusCap = DEFAULT_SPEED_BONUS_CAP,
): number {
  if (!Number.isFinite(fastChain)) return 0;
  const perStack = Number.isFinite(speedBonusPerStack) ? Math.max(0, speedBonusPerStack) : DEFAULT_SPEED_BONUS_PER_STACK;
  const cap = Number.isFinite(speedBonusCap) ? Math.max(0, Math.floor(speedBonusCap)) : DEFAULT_SPEED_BONUS_CAP;
  return Math.min(Math.max(0, Math.floor(fastChain)), cap) * perStack;
}
