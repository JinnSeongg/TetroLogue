import type { SpinResult } from "../../tetris/SpinDetector";

export type AttackType = "None" | "LineClear" | "TSpin" | "AllSpin" | "PerfectClear";

export type LineClearName = "None" | "Single" | "Double" | "Triple" | "Tetris";

export type AttackTag =
  | "LineClear"
  | "Single"
  | "Double"
  | "Triple"
  | "Tetris"
  | "Spin"
  | "TSpin"
  | "TSpinMini"
  | "AllSpin"
  | "PerfectClear"
  | "Combo"
  | "B2B";

export type ComboState = {
  count: number;
};

export type B2BState = {
  active: boolean;
};

export type AttackCalculationInput = {
  lineClearCount: number;
  spinResult: SpinResult;
  isPerfectClear: boolean;
  comboBefore: number;
  wasB2BActive: boolean;
  b2bCount?: number;
  fastChain?: number;
  speedBonusPerStack?: number;
  speedBonusCap?: number;
};

export type AttackBreakdown = {
  baseAttack: number;
  typeBonus: number;
  stateBonus: number;
  speedBonus: number;
  baseScaledDamage: number;
  comboDamage: number;
  comboDamageMultiplier: number;
  comboScaledDamage: number;
  b2bDamage: number;
  b2bDamageMultiplier: number;
  b2bScaledDamage: number;
  perfectClearDamage: number;
  perfectClearDamageMultiplier: number;
  perfectClearScaledDamage: number;
  flatBonus: number;
  counterBonus: number;
  finalDamage: number;
};

export type AttackResult = {
  attackType: AttackType;
  actionName: string;
  lineClearName: LineClearName;
  lineClearCount: number;
  spinResult: SpinResult;
  isPerfectClear: boolean;
  baseDamage: number;
  comboBonus: number;
  b2bBonus: number;
  perfectClearBonus: number;
  relicAttackBonus?: number;
  preRelicTotalDamage?: number;
  appliedRelicIds?: string[];
  totalDamage: number;
  breakdown: AttackBreakdown;
  baseAttack: number;
  typeBonus: number;
  stateBonus: number;
  speedBonus: number;
  baseScaledDamage: number;
  comboDamage: number;
  comboDamageMultiplier: number;
  comboScaledDamage: number;
  b2bDamage: number;
  b2bDamageMultiplier: number;
  b2bScaledDamage: number;
  perfectClearDamage: number;
  perfectClearDamageMultiplier: number;
  perfectClearScaledDamage: number;
  flatBonus: number;
  counterBonus: number;
  finalDamage: number;
  comboBefore: number;
  comboAfter: number;
  wasB2BActive: boolean;
  isB2BEligible: boolean;
  b2bCount: number;
  b2bAfter: boolean;
  tags: AttackTag[];
};
