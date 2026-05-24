import type { AttackResult, AttackTag } from "./AttackTypes";
import type { GarbagePacket } from "./GarbageQueue";

export type GarbageBlockingContext = {
  incomingGarbageAmount: number;
  source?: string;
  packets?: GarbagePacket[];
  attackResult?: AttackResult;
  attackTags: AttackTag[];
};

export type GarbageBlockResult = {
  amount: number;
  blockedAmount: number;
  reason?: string;
};

export interface GarbageBlockingRule {
  canApply(context: GarbageBlockingContext): boolean;
  modifyIncomingGarbage(context: GarbageBlockingContext): number | GarbageBlockResult;
}
