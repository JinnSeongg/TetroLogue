import type { SpinResult } from "../../tetris/SpinDetector";
import { noSpinResult } from "../../tetris/SpinDetector";
import type { AttackResult, AttackTag, AttackType, LineClearName } from "./AttackTypes";

export type CreateBaseAttackResultInput = {
  lineClearCount: number;
  spinResult?: SpinResult;
  isPerfectClear?: boolean;
  comboBefore?: number;
  comboAfter?: number;
  wasB2BActive?: boolean;
  isB2BEligible?: boolean;
  b2bAfter?: boolean;
  baseDamage?: number;
  comboBonus?: number;
  b2bBonus?: number;
  perfectClearBonus?: number;
};

export function createBaseAttackResult(input: CreateBaseAttackResultInput): AttackResult {
  const spinResult = input.spinResult ?? noSpinResult();
  const lineClearCount = clampLineClearCount(input.lineClearCount);
  const isPerfectClear = input.isPerfectClear ?? false;
  const baseDamage = input.baseDamage ?? 0;
  const comboBonus = input.comboBonus ?? 0;
  const b2bBonus = input.b2bBonus ?? 0;
  const perfectClearBonus = input.perfectClearBonus ?? 0;

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
    totalDamage: baseDamage + comboBonus + b2bBonus + perfectClearBonus,
    comboBefore: input.comboBefore ?? 0,
    comboAfter: input.comboAfter ?? 0,
    wasB2BActive: input.wasB2BActive ?? false,
    isB2BEligible: input.isB2BEligible ?? false,
    b2bAfter: input.b2bAfter ?? false,
    tags: createAttackTags({ lineClearCount, spinResult, isPerfectClear, comboBonus, b2bBonus }),
  };
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
