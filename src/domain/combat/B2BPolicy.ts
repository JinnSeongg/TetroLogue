import type { SpinResult } from "../tetris/SpinDetector";
import type { AttackType, B2BState } from "./AttackTypes";

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

  nextState(lineClearCount: number, isEligible: boolean, b2bState: B2BState): B2BState {
    if (lineClearCount <= 0) return b2bState;
    return { active: isEligible };
  }

  bonusFor(baseDamage: number, isEligible: boolean, b2bState: B2BState): number {
    if (baseDamage < 1 || !isEligible || !b2bState.active) return 0;
    return this.config.bonusDamage;
  }
}
