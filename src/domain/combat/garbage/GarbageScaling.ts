import type { DifficultyId as RunDifficultyId } from "../../balance/balanceTypes";
import type { FixedIntervalGarbagePattern } from "../../enemy/EnemyDefinition";

export type DifficultyId = "easy" | "normal" | "hard" | "expert" | "master";

export type GarbageScalingModifiers = {
  gpmMultiplier?: number;
  linesAdd?: number;
  intervalMultiplier?: number;
  travelDelayMsAdd?: number;
  initialDelayMsAdd?: number;
};

export type ScaledGarbagePatternResult = {
  enemyGpm: number;
  lines: number;
  intervalMs: number;
  travelDelayMs: number;
  initialDelayMs: number;
};

const FINAL_FLOOR_GPM: Record<DifficultyId, number> = {
  easy: 10,
  normal: 22,
  hard: 32,
  expert: 44,
  master: 56,
};

const DEFAULT_TRAVEL_DELAY_MS = 4000;

export function calculateFloorPressure(floor: number): number {
  const t = (clampFloor(floor) - 1) / 29;
  return 0.2 + 0.8 * Math.pow(t, 1.45);
}

export function calculateEnemyGpm(floor: number, difficulty: DifficultyId): number {
  return FINAL_FLOOR_GPM[normalizeDifficulty(difficulty)] * calculateFloorPressure(floor);
}

export function calculateGarbageLinesPerAttack(enemyGpm: number): number {
  if (enemyGpm <= 6) return 1;
  if (enemyGpm <= 12) return 2;
  if (enemyGpm <= 24) return 3;
  if (enemyGpm <= 36) return 4;
  if (enemyGpm <= 48) return 5;
  return 6;
}

export function calculateGarbageIntervalMs(enemyGpm: number, lines: number): number {
  if (!Number.isFinite(enemyGpm) || enemyGpm <= 0) return Number.POSITIVE_INFINITY;
  return (Math.max(1, Math.floor(lines)) * 60000) / enemyGpm;
}

export function calculateScaledGarbagePattern(
  floor: number,
  difficulty: DifficultyId,
  modifiers: GarbageScalingModifiers = {},
): ScaledGarbagePatternResult {
  const enemyGpm = sanitizePositiveNumber(calculateEnemyGpm(floor, difficulty) * (modifiers.gpmMultiplier ?? 1));
  const baseLines = calculateGarbageLinesPerAttack(enemyGpm);
  const lines = Math.max(1, baseLines + Math.floor(modifiers.linesAdd ?? 0));
  const intervalMs = calculateGarbageIntervalMs(enemyGpm, lines) * sanitizeMultiplier(modifiers.intervalMultiplier);
  const travelDelayMs = Math.max(0, DEFAULT_TRAVEL_DELAY_MS + Math.round(modifiers.travelDelayMsAdd ?? 0));
  const initialDelayBase = clamp(Math.min(intervalMs, 5000), 3000, intervalMs);
  const initialDelayMs = clamp(initialDelayBase + Math.round(modifiers.initialDelayMsAdd ?? 0), 3000, intervalMs);

  return {
    enemyGpm,
    lines,
    intervalMs,
    travelDelayMs,
    initialDelayMs,
  };
}

export function createScaledGarbagePattern(
  floor: number,
  difficulty: DifficultyId,
  modifiers: GarbageScalingModifiers = {},
): FixedIntervalGarbagePattern {
  const scaled = calculateScaledGarbagePattern(floor, difficulty, modifiers);
  return {
    type: "fixedInterval",
    lines: scaled.lines,
    intervalMs: scaled.intervalMs,
    travelDelayMs: scaled.travelDelayMs,
    initialDelayMs: scaled.initialDelayMs,
  };
}

export function toGarbageScalingDifficultyId(difficulty: RunDifficultyId | DifficultyId | string | undefined): DifficultyId {
  if (difficulty === "easy" || difficulty === "normal" || difficulty === "hard" || difficulty === "expert" || difficulty === "master") {
    return difficulty;
  }
  if (difficulty === "explorer") return "easy";
  if (difficulty === "standard") return "normal";
  if (difficulty === "advanced") return "hard";
  if (difficulty === "void") return "master";
  return normalizeDifficulty(difficulty);
}

function normalizeDifficulty(difficulty: string | undefined): DifficultyId {
  return difficulty === "easy" || difficulty === "normal" || difficulty === "hard" || difficulty === "expert" || difficulty === "master"
    ? difficulty
    : "normal";
}

function clampFloor(floor: number): number {
  if (!Number.isFinite(floor)) return 1;
  return Math.min(30, Math.max(1, Math.round(floor)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeMultiplier(value: number | undefined): number {
  if (value === undefined) return 1;
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function sanitizePositiveNumber(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
