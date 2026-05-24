import type { GarbageHolePattern } from "./GarbageHoleGenerator";
import type { GarbageBlockingRule } from "./GarbageBlockingRule";

export const garbageConfig = {
  defaultIncomingGarbageDelay: 2,
  defaultHolePattern: { type: "LimitedRandom", changeChance: 0.35 } satisfies GarbageHolePattern,
};

export type GarbageApplyConfig = {
  holePattern?: GarbageHolePattern;
  blockingRules?: GarbageBlockingRule[];
};
