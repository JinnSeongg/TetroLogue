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
  totalDamage: number;
  comboBefore: number;
  comboAfter: number;
  wasB2BActive: boolean;
  isB2BEligible: boolean;
  b2bAfter: boolean;
  tags: AttackTag[];
};
