import type { SoundDefinition, SoundEventKey } from "./AudioService";

const publicBase = import.meta.env.BASE_URL.replace(/\/$/, "");
const sfx = `${publicBase}/assets/audio/sfx`;
const ui = `${publicBase}/assets/audio/ui`;

export const audioRegistry: Record<SoundEventKey, SoundDefinition> = {
  move: { src: `${sfx}/piece-move-2.mp3`, group: "sfx", maxConcurrent: 32 },
  rotate: { src: `${sfx}/piece-move-2.mp3`, group: "sfx", maxConcurrent: 16 },
  softDrop: { src: `${sfx}/piece-move-2.mp3`, group: "sfx", maxConcurrent: 32 },
  hardDrop: { group: "sfx" },
  lock: { src: `${sfx}/piece-lock.mp3`, group: "sfx", minIntervalMs: 70, maxConcurrent: 2 },
  clear: { src: `${sfx}/clear-single.mp3`, group: "sfx", minIntervalMs: 80, maxConcurrent: 2 },
  single: { src: `${sfx}/clear-single.mp3`, group: "sfx", fallback: "clear", minIntervalMs: 80, maxConcurrent: 2 },
  double: { src: `${sfx}/clear-single.mp3`, group: "sfx", fallback: "clear", minIntervalMs: 80, maxConcurrent: 2 },
  triple: { src: `${sfx}/clear-single.mp3`, group: "sfx", fallback: "clear", minIntervalMs: 80, maxConcurrent: 2 },
  tetris: { src: `${sfx}/all-clear.mp3`, group: "sfx", fallback: "clear", minIntervalMs: 100, maxConcurrent: 1 },
  tspin: { src: `${sfx}/t-spin.mp3`, group: "sfx", fallback: "tetris", minIntervalMs: 100, maxConcurrent: 1 },
  combo: { src: `${sfx}/hard-drop.mp3`, group: "sfx", minIntervalMs: 90, maxConcurrent: 2 },
  backToBack: { src: `${sfx}/t-spin.mp3`, group: "sfx", fallback: "combo", minIntervalMs: 120, maxConcurrent: 1 },
  perfectClear: { src: `${sfx}/clear-tetris.mp3`, group: "sfx", fallback: "tetris", minIntervalMs: 160, maxConcurrent: 1 },
  attack: { group: "sfx" },
  hit: { group: "sfx" },
  danger: { group: "sfx" },
  garbageIncoming: { src: `${sfx}/garbage-rise.mp3`, group: "ui", fallback: "danger", minIntervalMs: 400, maxConcurrent: 1 },
  menuHover: { src: `${ui}/ui-click.mp3`, group: "ui", minIntervalMs: 70, maxConcurrent: 1 },
  menuClick: { src: `${ui}/ui-click.mp3`, group: "ui", minIntervalMs: 80, maxConcurrent: 2 },
  confirm: { src: `${ui}/ui-click.mp3`, group: "ui", fallback: "menuClick", minIntervalMs: 120, maxConcurrent: 1 },
  cancel: { src: `${ui}/ui-click.mp3`, group: "ui", fallback: "menuClick", minIntervalMs: 120, maxConcurrent: 1 },
  win: { src: `${sfx}/all-clear.mp3`, group: "ui", fallback: "perfectClear", minIntervalMs: 240, maxConcurrent: 1 },
  lose: { src: `${sfx}/garbage-rise.mp3`, group: "ui", fallback: "danger", minIntervalMs: 240, maxConcurrent: 1 },
};
