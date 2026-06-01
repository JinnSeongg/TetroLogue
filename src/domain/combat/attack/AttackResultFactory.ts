import type { SpinResult } from "../../tetris/SpinDetector";
import { noSpinResult } from "../../tetris/SpinDetector";
import type { AttackBreakdown, AttackResult, AttackTag, AttackType, LineClearName } from "./AttackTypes";

export type CreateBaseAttackResultInput = {
  lineClearCount: number;
  spinResult?: SpinResult;
  isPerfectClear?: boolean;
  comboBefore?: number;
  comboAfter?: number;
  wasB2BActive?: boolean;
  isB2BEligible?: boolean;
  b2bAfter?: boolean;
  b2bCount?: number;
  baseDamage?: number;
  comboBonus?: number;
  b2bBonus?: number;
  perfectClearBonus?: number;
  baseAttack?: number;
  typeBonus?: number;
  stateBonus?: number;
  speedBonus?: number;
  comboDamage?: number;
  comboDamageMultiplier?: number;
  b2bDamage?: number;
  b2bDamageMultiplier?: number;
  perfectClearDamage?: number;
  perfectClearDamageMultiplier?: number;
  flatBonus?: number;
  counterBonus?: number;
};

export function createBaseAttackResult(input: CreateBaseAttackResultInput): AttackResult {
  const spinResult = input.spinResult ?? noSpinResult();
  const lineClearCount = clampLineClearCount(input.lineClearCount);
  const isPerfectClear = input.isPerfectClear ?? false;
  const breakdown = calculateAttackBreakdown({
    baseAttack: input.baseAttack ?? input.baseDamage ?? 0,
    typeBonus: input.typeBonus ?? 0,
    stateBonus: input.stateBonus ?? 0,
    speedBonus: input.speedBonus ?? 0,
    comboDamage: input.comboDamage ?? input.comboBonus ?? 0,
    comboDamageMultiplier: input.comboDamageMultiplier ?? 1,
    b2bDamage: input.b2bDamage ?? input.b2bBonus ?? 0,
    b2bDamageMultiplier: input.b2bDamageMultiplier ?? 1,
    perfectClearDamage: input.perfectClearDamage ?? input.perfectClearBonus ?? 0,
    perfectClearDamageMultiplier: input.perfectClearDamageMultiplier ?? 1,
    flatBonus: input.flatBonus ?? 0,
    counterBonus: input.counterBonus ?? 0,
  });
  const baseDamage = breakdown.baseScaledDamage;
  const comboBonus = breakdown.comboScaledDamage;
  const b2bBonus = breakdown.b2bScaledDamage;
  const perfectClearBonus = breakdown.perfectClearScaledDamage;

  return {
    attackType: attackTypeFor(lineClearCount, spinResult, isPerfectClear),
    actionName: createActionName(lineClearCount, spinResult, isPerfectClear),
    lineClearName: lineClearNameFor(lineClearCount),
    lineClearCount,
    spinResult,
    isPerfectClear,
    baseDamage,
    comboBonus,
    b2bBonus,
    perfectClearBonus,
    totalDamage: breakdown.finalDamage,
    breakdown,
    ...breakdown,
    comboBefore: input.comboBefore ?? 0,
    comboAfter: input.comboAfter ?? 0,
    wasB2BActive: input.wasB2BActive ?? false,
    isB2BEligible: input.isB2BEligible ?? false,
    b2bCount: input.b2bCount ?? 0,
    b2bAfter: input.b2bAfter ?? false,
    tags: createAttackTags({ lineClearCount, spinResult, isPerfectClear, comboBonus, b2bBonus }),
  };
}

export type CalculateAttackBreakdownInput = Omit<
  AttackBreakdown,
  "baseScaledDamage" | "comboScaledDamage" | "b2bScaledDamage" | "perfectClearScaledDamage" | "finalDamage"
>;

export function calculateAttackBreakdown(input: CalculateAttackBreakdownInput): AttackBreakdown {
  const baseAttack = sanitizeDamageInput(input.baseAttack);
  const typeBonus = sanitizeBonus(input.typeBonus);
  const stateBonus = sanitizeBonus(input.stateBonus);
  const speedBonus = sanitizeBonus(input.speedBonus);
  const comboDamage = sanitizeDamageInput(input.comboDamage);
  const comboDamageMultiplier = sanitizeMultiplier(input.comboDamageMultiplier);
  const b2bDamage = sanitizeDamageInput(input.b2bDamage);
  const b2bDamageMultiplier = sanitizeMultiplier(input.b2bDamageMultiplier);
  const perfectClearDamage = sanitizeDamageInput(input.perfectClearDamage);
  const perfectClearDamageMultiplier = sanitizeMultiplier(input.perfectClearDamageMultiplier);
  const flatBonus = sanitizeBonus(input.flatBonus);
  const counterBonus = sanitizeBonus(input.counterBonus);

  const baseScaledDamage = roundDamage(baseAttack * (1 + typeBonus + stateBonus + speedBonus));
  const comboScaledDamage = roundDamage(comboDamage * comboDamageMultiplier);
  const b2bScaledDamage = roundDamage(b2bDamage * b2bDamageMultiplier);
  const perfectClearScaledDamage = roundDamage(perfectClearDamage * perfectClearDamageMultiplier);
  const finalDamage = Math.max(
    0,
    roundDamage(baseScaledDamage + comboScaledDamage + b2bScaledDamage + perfectClearScaledDamage + flatBonus + counterBonus),
  );

  return {
    baseAttack,
    typeBonus,
    stateBonus,
    speedBonus,
    baseScaledDamage,
    comboDamage,
    comboDamageMultiplier,
    comboScaledDamage,
    b2bDamage,
    b2bDamageMultiplier,
    b2bScaledDamage,
    perfectClearDamage,
    perfectClearDamageMultiplier,
    perfectClearScaledDamage,
    flatBonus,
    counterBonus,
    finalDamage,
  };
}

function roundDamage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

function sanitizeDamageInput(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function sanitizeBonus(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value;
}

function sanitizeMultiplier(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return value;
}

export function attackTypeFor(lineClearCount: number, spinResult: SpinResult, isPerfectClear = false): AttackType {
  if (spinResult.kind === "TSpin") return "TSpin";
  if (spinResult.kind === "AllSpin") return "AllSpin";
  if (lineClearCount > 0) return "LineClear";
  void isPerfectClear;
  return "None";
}

export function lineClearNameFor(lineClearCount: number): LineClearName {
  if (lineClearCount === 1) return "Single";
  if (lineClearCount === 2) return "Double";
  if (lineClearCount === 3) return "Triple";
  if (lineClearCount === 4) return "Tetris";
  return "None";
}

export function createActionName(lineClearCount: number, spinResult: SpinResult, isPerfectClear = false): string {
  const lineName = lineClearNameFor(lineClearCount);
  const spinName = spinActionName(lineClearCount, spinResult);
  const baseName = spinName ?? (lineName === "None" ? "None" : lineName);
  return isPerfectClear ? `${baseName} Perfect Clear` : baseName;
}

export function createAttackTags(input: {
  lineClearCount: number;
  spinResult: SpinResult;
  isPerfectClear?: boolean;
  comboBonus?: number;
  b2bBonus?: number;
}): AttackTag[] {
  const tags: AttackTag[] = [];
  const lineName = lineClearNameFor(input.lineClearCount);

  if (input.lineClearCount > 0) {
    tags.push("LineClear");
    if (lineName !== "None") tags.push(lineName);
  }

  if (input.spinResult.kind === "TSpin") {
    tags.push("Spin", "TSpin");
    if (input.spinResult.grade === "Mini") tags.push("TSpinMini");
  }

  if (input.spinResult.kind === "AllSpin") {
    tags.push("Spin", "AllSpin");
  }

  if (input.isPerfectClear) tags.push("PerfectClear");
  if ((input.comboBonus ?? 0) >= 1) tags.push("Combo");
  if ((input.b2bBonus ?? 0) >= 1) tags.push("B2B");
  return tags;
}

function spinActionName(lineClearCount: number, spinResult: SpinResult): string | undefined {
  if (spinResult.kind === "TSpin") {
    if (lineClearCount === 1 && spinResult.grade === "Mini") return "T-spin Mini Single";
    if (lineClearCount === 1) return "T-spin Single";
    if (lineClearCount === 2) return "T-spin Double";
    if (lineClearCount === 3) return "T-spin Triple";
    return undefined;
  }

  if (spinResult.kind === "AllSpin") {
    const pieceName = spinResult.pieceType ?? "All";
    if (lineClearCount === 1) return `${pieceName}-spin Single`;
    if (lineClearCount === 2) return `${pieceName}-spin Double`;
    if (lineClearCount === 3) return `${pieceName}-spin Triple`;
    if (lineClearCount === 4) return `${pieceName}-spin Quad`;
  }

  return undefined;
}

function clampLineClearCount(lineClearCount: number): number {
  return Math.min(Math.max(lineClearCount, 0), 4);
}
