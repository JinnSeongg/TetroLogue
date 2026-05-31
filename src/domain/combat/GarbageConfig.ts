import type { GarbageHolePattern } from "./GarbageHoleGenerator";
import type { GarbageBlockingRule } from "./GarbageBlockingRule";

export const garbageConfig = {
  garbageEntryDelayMs: 2500,
  maxGarbageApplyPerLock: 4,
  garbageBlockingPolicy: "full",
  applyMode: "chunked",
  queueCancelOrder: "oldestFirst",
  defaultHolePattern: { type: "LimitedRandom", changeChance: 0.35 } satisfies GarbageHolePattern,
};

export type GarbageApplyConfig = {
  holePattern?: GarbageHolePattern;
  blockingRules?: GarbageBlockingRule[];
};
