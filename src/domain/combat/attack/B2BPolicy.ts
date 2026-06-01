import type { SpinResult } from "../../tetris/SpinDetector";
import type { AttackType } from "./AttackTypes";

export class B2BPolicy {
  isEligible(attackType: AttackType, lineClearCount: number, spinResult: SpinResult): boolean {
    if (lineClearCount <= 0) return false;
    if (attackType === "LineClear") return lineClearCount >= 4;
    if (attackType === "TSpin") return true;
    if (attackType === "AllSpin") return lineClearCount >= 2 && spinResult.kind === "AllSpin";
    return false;
  }

  damageFor(baseDamage: number, isB2BEligible: boolean, b2bCount: number): number {
    if (baseDamage < 1 || !isB2BEligible) return 0;
    return Math.max(0, Math.round(Number.isFinite(b2bCount) ? b2bCount : 0));
  }

  nextActive(lineClearCount: number, isB2BEligible: boolean, wasB2BActive: boolean): boolean {
    if (lineClearCount <= 0) return wasB2BActive;
    return isB2BEligible;
  }
}
