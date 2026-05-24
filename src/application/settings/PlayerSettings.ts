export type KeyBindings = {
  moveLeft: string[];
  moveRight: string[];
  softDrop: string[];
  hardDrop: string[];
  rotateClockwise: string[];
  rotateCounterClockwise: string[];
  rotate180: string[];
  hold: string[];
};

export type PlayerSettings = {
  input: {
    dasMs: number;
    arrMs: number;
    keyBindings: KeyBindings;
  };
  accessibility: Record<string, never>;
  video: Record<string, never>;
  audio: Record<string, never>;
};

export const defaultPlayerSettings: PlayerSettings = {
  input: {
    dasMs: 150,
    arrMs: 45,
    keyBindings: {
      moveLeft: ["ArrowLeft"],
      moveRight: ["ArrowRight"],
      softDrop: ["ArrowDown"],
      hardDrop: [" "],
      rotateClockwise: ["ArrowUp", "x", "X"],
      rotateCounterClockwise: ["z", "Z", "Control"],
      rotate180: ["a", "A"],
      hold: ["c", "C", "Shift"],
    },
  },
  accessibility: {},
  video: {},
  audio: {},
};

export const sanitizePlayerSettings = (value: unknown): PlayerSettings => {
  if (!value || typeof value !== "object") return defaultPlayerSettings;
  const candidate = value as Partial<PlayerSettings>;
  const dasMs = clampNumber(candidate.input?.dasMs, 60, 400, defaultPlayerSettings.input.dasMs);
  const arrMs = clampNumber(candidate.input?.arrMs, 0, 120, defaultPlayerSettings.input.arrMs);

  return {
    ...defaultPlayerSettings,
    input: {
      dasMs,
      arrMs,
      keyBindings: defaultPlayerSettings.input.keyBindings,
    },
  };
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
