import type { SpinResult } from "../../tetris/SpinDetector";
import type { AttackType } from "./AttackTypes";

export type B2BPolicyConfig = {
  bonusDamage: number;
};

export const defaultB2BPolicyConfig: B2BPolicyConfig = {
  bonusDamage: 1,
};

export class B2BPolicy {
  constructor(private readonly config: B2BPolicyConfig = defaultB2BPolicyConfig) {}

  isEligible(attackType: AttackType, lineClearCount: number, spinResult: SpinResult): boolean {
    if (lineClearCount <= 0) return false;
    if (attackType === "LineClear") return lineClearCount >= 4;
    if (attackType === "TSpin") return true;
    if (attackType === "AllSpin") return lineClearCount >= 2 && spinResult.kind === "AllSpin";
    return false;
  }

  bonusFor(baseDamage: number, isB2BEligible: boolean, wasB2BActive: boolean): number {
    if (baseDamage < 1 || !isB2BEligible || !wasB2BActive) return 0;
    return this.config.bonusDamage;
  }

  nextActive(lineClearCount: number, isB2BEligible: boolean, wasB2BActive: boolean): boolean {
    if (lineClearCount <= 0) return wasB2BActive;
    return isB2BEligible;
  }
}
