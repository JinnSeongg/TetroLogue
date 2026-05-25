export type TetrisRuleSet = {
  boardWidth: number;
  boardHeight: number;
  visibleHeight: number;
  nextPreviewCount: number;
  holdEnabled: boolean;
  gravityMs: number;
  softDropGravityMs: number;
  lockDelayMs: number;
  maxLockResets: number;
  ghostPieceEnabled: boolean;
  keepBackToBackOnEmptyTSpin: boolean;
};

export const standardRuleSet: TetrisRuleSet = {
  boardWidth: 10,
  boardHeight: 20,
  visibleHeight: 20,
  nextPreviewCount: 5,
  holdEnabled: true,
  gravityMs: 900,
  softDropGravityMs: 100,
  lockDelayMs: 500,
  maxLockResets: 15,
  ghostPieceEnabled: true,
  keepBackToBackOnEmptyTSpin: true,
};
