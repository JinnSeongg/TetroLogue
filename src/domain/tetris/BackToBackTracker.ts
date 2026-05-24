export class BackToBackTracker {
  constructor(public readonly active = false) {}

  next(linesCleared: number): BackToBackTracker {
    if (linesCleared === 4) return new BackToBackTracker(true);
    if (linesCleared > 0) return new BackToBackTracker(false);
    return this;
  }
}
