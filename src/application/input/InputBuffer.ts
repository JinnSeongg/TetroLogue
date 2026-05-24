import type { PlayerInput } from "../GameAppState";

export type BufferedInput = {
  id: string;
  command: PlayerInput;
  timestampMs: number;
};

export type InputBuffer = {
  entries: BufferedInput[];
  bufferMs: number;
  maxBufferSize: number;
};

export const defaultInputBufferMs = 120;
export const defaultMaxInputBufferSize = 5;

export const createInputBuffer = (
  bufferMs = defaultInputBufferMs,
  maxBufferSize = defaultMaxInputBufferSize,
): InputBuffer => ({
  entries: [],
  bufferMs,
  maxBufferSize,
});

export const enqueueInput = (buffer: InputBuffer, command: PlayerInput, timestampMs: number): InputBuffer => {
  const freshEntries = pruneExpiredInputs(buffer, timestampMs).entries;
  const nextEntries = [...freshEntries, { id: `${command}-${timestampMs}-${freshEntries.length}`, command, timestampMs }];
  return {
    ...buffer,
    entries: nextEntries.slice(Math.max(0, nextEntries.length - buffer.maxBufferSize)),
  };
};

export const pruneExpiredInputs = (buffer: InputBuffer, nowMs: number): InputBuffer => ({
  ...buffer,
  entries: buffer.entries.filter((entry) => nowMs <= entry.timestampMs + buffer.bufferMs),
});

export const consumeInput = (buffer: InputBuffer, id: string): InputBuffer => ({
  ...buffer,
  entries: buffer.entries.filter((entry) => entry.id !== id),
});

export const consumeInputsByCommand = (buffer: InputBuffer, commands: PlayerInput[]): InputBuffer => {
  if (commands.length === 0) return buffer;
  const consumed = new Set(commands);
  return {
    ...buffer,
    entries: buffer.entries.filter((entry) => !consumed.has(entry.command)),
  };
};

const inputPriority: Record<PlayerInput, number> = {
  hardDrop: 0,
  hold: 1,
  rotateClockwise: 2,
  rotateCounterClockwise: 2,
  rotate180: 2,
  moveLeft: 3,
  moveRight: 3,
};

export const sortedBufferedInputs = (buffer: InputBuffer): BufferedInput[] =>
  [...buffer.entries].sort((a, b) => inputPriority[a.command] - inputPriority[b.command] || a.timestampMs - b.timestampMs);
