export class ComboTracker {
  constructor(public readonly combo = -1) {}

  next(linesCleared: number): ComboTracker {
    return linesCleared > 0 ? new ComboTracker(this.combo + 1) : new ComboTracker(-1);
  }
}
