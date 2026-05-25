import { noSpinResult, type SpinResult } from "./SpinDetector";

export type LineClearName = "None" | "Single" | "Double" | "Triple" | "Tetris";

export type ClearResult = {
  linesCleared: number;
  clearedRows: number[];
  lineClearName: LineClearName;
  isSpin: boolean;
  isTSpin: boolean;
  isTSpinMini: boolean;
  isPerfectClear: boolean;
  spinResult: SpinResult;
  displayName: string;
};

export type CreateClearResultInput = {
  linesCleared: number;
  clearedRows?: number[];
  spinResult?: SpinResult;
  isPerfectClear?: boolean;
};

export function createClearResult(input: CreateClearResultInput): ClearResult {
  const linesCleared = clampLineClearCount(input.linesCleared);
  const spinResult = input.spinResult ?? noSpinResult();
  const isPerfectClear = input.isPerfectClear ?? false;
  const lineClearName = lineClearNameFor(linesCleared);
  const isTSpin = spinResult.kind === "TSpin";
  const isTSpinMini = isTSpin && spinResult.grade === "Mini";

  return {
    linesCleared,
    clearedRows: input.clearedRows ?? [],
    lineClearName,
    isSpin: spinResult.kind !== "None",
    isTSpin,
    isTSpinMini,
    isPerfectClear,
    spinResult,
    displayName: createClearDisplayName({ linesCleared, spinResult, isPerfectClear }),
  };
}

export function lineClearNameFor(linesCleared: number): LineClearName {
  if (linesCleared === 1) return "Single";
  if (linesCleared === 2) return "Double";
  if (linesCleared === 3) return "Triple";
  if (linesCleared === 4) return "Tetris";
  return "None";
}

export function createClearDisplayName(input: CreateClearResultInput): string {
  const linesCleared = clampLineClearCount(input.linesCleared);
  if (input.isPerfectClear) return "Perfect Clear";

  const lineName = lineClearNameFor(linesCleared);
  if (lineName === "None") return "None";

  const spinResult = input.spinResult ?? noSpinResult();
  if (spinResult.kind === "TSpin") {
    return spinResult.grade === "Mini" ? `T-Spin Mini ${lineName}` : `T-Spin ${lineName}`;
  }

  return lineName;
}

function clampLineClearCount(linesCleared: number): number {
  return Math.min(Math.max(linesCleared, 0), 4);
}
