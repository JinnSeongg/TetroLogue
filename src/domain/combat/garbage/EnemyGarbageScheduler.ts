import type { EnemyGarbagePattern, FixedIntervalGarbagePattern } from "../../enemy/EnemyDefinition";

export type EnemyGarbagePacketInfo = {
  lines: number;
  travelDelayMs: number;
  source: "enemy";
};

export class EnemyGarbageScheduler {
  constructor(
    private readonly remainingMs?: number,
    private readonly patternKey?: string,
  ) {}

  tick(deltaMs: number, pattern?: EnemyGarbagePattern): {
    scheduler: EnemyGarbageScheduler;
    generatedPackets: EnemyGarbagePacketInfo[];
  } {
    if (!pattern) return { scheduler: this, generatedPackets: [] };
    const fixedPattern = resolveFixedIntervalPattern(pattern);
    if (!fixedPattern) return { scheduler: this.resetForPattern(pattern), generatedPackets: [] };

    const key = patternKey(pattern);
    let remainingMs = this.patternKey === key && this.remainingMs !== undefined ? this.remainingMs : firstDelayMs(fixedPattern);
    let elapsedMs = Math.max(0, Math.round(deltaMs));
    const generatedPackets: EnemyGarbagePacketInfo[] = [];

    while (elapsedMs > 0) {
      if (remainingMs > elapsedMs) {
        remainingMs -= elapsedMs;
        elapsedMs = 0;
        break;
      }

      elapsedMs -= remainingMs;
      if (fixedPattern.lines > 0) {
        generatedPackets.push({
          lines: fixedPattern.lines,
          travelDelayMs: fixedPattern.travelDelayMs,
          source: "enemy",
        });
      }
      remainingMs = fixedPattern.intervalMs;
      if (remainingMs <= 0) break;
    }

    return {
      scheduler: new EnemyGarbageScheduler(remainingMs, key),
      generatedPackets,
    };
  }

  getNextAttackInfo(pattern?: EnemyGarbagePattern): { lines: number; remainingMs: number } | null {
    if (!pattern) return null;
    const fixedPattern = resolveFixedIntervalPattern(pattern);
    if (!fixedPattern) return null;
    return {
      lines: fixedPattern.lines,
      remainingMs: this.patternKey === patternKey(pattern) && this.remainingMs !== undefined ? this.remainingMs : firstDelayMs(fixedPattern),
    };
  }

  getState(): { remainingMs?: number; patternKey?: string } {
    return { remainingMs: this.remainingMs, patternKey: this.patternKey };
  }

  private resetForPattern(pattern: EnemyGarbagePattern): EnemyGarbageScheduler {
    const key = patternKey(pattern);
    if (this.patternKey === key) return this;
    return new EnemyGarbageScheduler(undefined, key);
  }
}

function resolveFixedIntervalPattern(pattern: EnemyGarbagePattern): FixedIntervalGarbagePattern | undefined {
  if (pattern.type === "fixedInterval") return pattern;
  // TODO: Implement sequence and phase schedulers when enemy patterns need them.
  return undefined;
}

function firstDelayMs(pattern: FixedIntervalGarbagePattern): number {
  return sanitizePositiveMs(pattern.initialDelayMs ?? pattern.intervalMs);
}

function sanitizePositiveMs(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function patternKey(pattern: EnemyGarbagePattern): string {
  return JSON.stringify(pattern);
}
