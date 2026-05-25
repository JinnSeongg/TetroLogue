import type { CombatFeedbackEvent, CombatFeedbackIntensity } from "../../domain/combat/CombatFeedbackEvent";

export type ScreenShakeConfig = {
  durationMs: number;
  strengthPx: number;
  frequencyHz: number;
  decay: number;
};

export type ScreenShakeFrame = {
  x: number;
  y: number;
  rotationDeg: number;
};

const maxShakeConfig: ScreenShakeConfig = {
  durationMs: 360,
  strengthPx: 8,
  frequencyHz: 34,
  decay: 1,
};

export const defaultScreenShakeConfigs: Record<"medium" | "high" | "critical", ScreenShakeConfig> = {
  medium: { durationMs: 120, strengthPx: 2, frequencyHz: 20, decay: 0.86 },
  high: { durationMs: 180, strengthPx: 4, frequencyHz: 26, decay: 0.9 },
  critical: { durationMs: 260, strengthPx: 6, frequencyHz: 32, decay: 0.94 },
};

export class ScreenShakeService {
  constructor(private readonly configs = defaultScreenShakeConfigs) {}

  configFor(event?: CombatFeedbackEvent): ScreenShakeConfig | undefined {
    if (!event || !isShakeIntensity(event.intensity)) return undefined;
    return this.clamp(this.configs[event.intensity]);
  }

  frameAt(elapsedMs: number, config: ScreenShakeConfig): ScreenShakeFrame {
    if (elapsedMs < 0 || elapsedMs > config.durationMs) return { x: 0, y: 0, rotationDeg: 0 };
    const progress = config.durationMs <= 0 ? 1 : elapsedMs / config.durationMs;
    const amplitude = config.strengthPx * Math.pow(Math.max(0, 1 - progress), config.decay);
    const phase = elapsedMs * (config.frequencyHz / 1000) * Math.PI * 2;
    return {
      x: Math.sin(phase) * amplitude,
      y: Math.cos(phase * 1.37) * amplitude * 0.65,
      rotationDeg: Math.sin(phase * 0.73) * amplitude * 0.08,
    };
  }

  private clamp(config: ScreenShakeConfig): ScreenShakeConfig {
    return {
      durationMs: clamp(config.durationMs, 0, maxShakeConfig.durationMs),
      strengthPx: clamp(config.strengthPx, 0, maxShakeConfig.strengthPx),
      frequencyHz: clamp(config.frequencyHz, 0, maxShakeConfig.frequencyHz),
      decay: clamp(config.decay, 0.1, maxShakeConfig.decay),
    };
  }
}

function isShakeIntensity(intensity: CombatFeedbackIntensity): intensity is "medium" | "high" | "critical" {
  return intensity === "medium" || intensity === "high" || intensity === "critical";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
