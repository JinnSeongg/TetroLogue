import type { ClearResult } from "../tetris/ClearResult";

export type ComboB2BTrackerConfig = {
  keepBackToBackOnEmptyTSpin: boolean;
};

export const defaultComboB2BTrackerConfig: ComboB2BTrackerConfig = {
  keepBackToBackOnEmptyTSpin: true,
};

export type ComboB2BState = {
  comboCount: number;
  comboDisplayCount: number;
  isComboActive: boolean;
  isBackToBack: boolean;
  backToBackCount: number;
};

export type ComboB2BResult = ComboB2BState & {
  backToBackBroken: boolean;
};

export class ComboB2BTracker {
  constructor(
    private readonly state: ComboB2BState = createInitialComboB2BState(),
    private readonly config: ComboB2BTrackerConfig = defaultComboB2BTrackerConfig,
  ) {}

  next(clearResult: ClearResult): ComboB2BResult {
    const comboCount = clearResult.linesCleared > 0 ? this.state.comboCount + 1 : 0;
    const b2bEligible = isBackToBackEligible(clearResult);
    const emptyTSpin = clearResult.linesCleared === 0 && clearResult.isTSpin;
    const breaksBackToBack = (clearResult.linesCleared > 0 && !b2bEligible) || (emptyTSpin && !this.config.keepBackToBackOnEmptyTSpin);
    const keepsBackToBack = emptyTSpin && this.config.keepBackToBackOnEmptyTSpin;
    const isBackToBack = b2bEligible ? true : keepsBackToBack ? this.state.isBackToBack : breaksBackToBack ? false : this.state.isBackToBack;
    const backToBackCount = b2bEligible ? this.state.backToBackCount + 1 : breaksBackToBack ? 0 : this.state.backToBackCount;

    return {
      comboCount,
      comboDisplayCount: Math.max(0, comboCount - 1),
      isComboActive: comboCount > 1,
      isBackToBack,
      backToBackCount,
      backToBackBroken: this.state.isBackToBack && breaksBackToBack,
    };
  }
}

export function createInitialComboB2BState(): ComboB2BState {
  return {
    comboCount: 0,
    comboDisplayCount: 0,
    isComboActive: false,
    isBackToBack: false,
    backToBackCount: 0,
  };
}

export function isBackToBackEligible(clearResult: ClearResult): boolean {
  if (clearResult.linesCleared <= 0) return false;
  return clearResult.lineClearName === "Tetris" || clearResult.isTSpin;
}
