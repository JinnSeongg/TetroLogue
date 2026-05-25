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

export const controlActions = [
  "moveLeft",
  "moveRight",
  "softDrop",
  "hardDrop",
  "rotateClockwise",
  "rotateCounterClockwise",
  "rotate180",
  "hold",
] as const;

export type ControlAction = (typeof controlActions)[number];

export type PlayerSettings = {
  input: {
    dasMs: number;
    arrMs: number;
    softDropGravityMs: number;
    keyBindings: KeyBindings;
  };
  accessibility: Record<string, never>;
  video: {
    screenShakeEnabled: boolean;
    ghostPieceEnabled: boolean;
    gridVisible: boolean;
  };
  audio: {
    masterVolume: number;
    bgmVolume: number;
    sfxVolume: number;
    uiVolume: number;
    musicVolume: number;
  };
};

export const defaultPlayerSettings: PlayerSettings = {
  input: {
    dasMs: 150,
    arrMs: 45,
    softDropGravityMs: 20,
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
  video: {
    screenShakeEnabled: true,
    ghostPieceEnabled: true,
    gridVisible: true,
  },
  audio: {
    masterVolume: 80,
    bgmVolume: 70,
    sfxVolume: 80,
    uiVolume: 80,
    musicVolume: 70,
  },
};

export const sanitizePlayerSettings = (value: unknown): PlayerSettings => {
  if (!value || typeof value !== "object") return defaultPlayerSettings;
  const candidate = value as Partial<PlayerSettings>;
  const dasMs = clampNumber(candidate.input?.dasMs, 60, 400, defaultPlayerSettings.input.dasMs);
  const arrMs = clampNumber(candidate.input?.arrMs, 0, 120, defaultPlayerSettings.input.arrMs);
  const softDropGravityMs = clampNumber(candidate.input?.softDropGravityMs, 1, 120, defaultPlayerSettings.input.softDropGravityMs);

  return {
    ...defaultPlayerSettings,
    input: {
      dasMs,
      arrMs,
      softDropGravityMs,
      keyBindings: sanitizeKeyBindings(candidate.input?.keyBindings),
    },
    video: {
      screenShakeEnabled: sanitizeBoolean(candidate.video?.screenShakeEnabled, defaultPlayerSettings.video.screenShakeEnabled),
      ghostPieceEnabled: sanitizeBoolean(candidate.video?.ghostPieceEnabled, defaultPlayerSettings.video.ghostPieceEnabled),
      gridVisible: sanitizeBoolean(candidate.video?.gridVisible, defaultPlayerSettings.video.gridVisible),
    },
    audio: {
      masterVolume: clampNumber(candidate.audio?.masterVolume, 0, 100, defaultPlayerSettings.audio.masterVolume),
      bgmVolume: clampNumber(candidate.audio?.bgmVolume, 0, 100, defaultPlayerSettings.audio.bgmVolume),
      sfxVolume: clampNumber(candidate.audio?.sfxVolume, 0, 100, defaultPlayerSettings.audio.sfxVolume),
      uiVolume: clampNumber(candidate.audio?.uiVolume, 0, 100, defaultPlayerSettings.audio.uiVolume),
      musicVolume: clampNumber(candidate.audio?.musicVolume ?? candidate.audio?.bgmVolume, 0, 100, defaultPlayerSettings.audio.musicVolume),
    },
  };
};

function sanitizeKeyBindings(value: unknown): KeyBindings {
  const candidate = value && typeof value === "object" ? (value as Partial<Record<ControlAction, unknown>>) : {};
  return controlActions.reduce<KeyBindings>((bindings, action) => {
    const keys = candidate[action];
    bindings[action] = Array.isArray(keys) && keys.every((key) => typeof key === "string") && keys.length > 0 ? [...new Set(keys)] : defaultPlayerSettings.input.keyBindings[action];
    return bindings;
  }, {} as KeyBindings);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
