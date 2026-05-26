export type TetrisRuleSet = {
  boardWidth: number;
  boardHeight: number;
  visibleHeight: number;
  nextPreviewCount: number;
  holdEnabled: boolean;
  maxHoldSlots: number;
  gravityMs: number;
  softDropGravityMs: number;
  lockDelayMs: number;
  maxLockResets: number;
  fastChainWindowMs: number;
  fastStateThreshold: number;
  ghostPieceEnabled: boolean;
  keepBackToBackOnEmptyTSpin: boolean;
};

export const standardRuleSet: TetrisRuleSet = {
  boardWidth: 10,
  boardHeight: 20,
  visibleHeight: 20,
  nextPreviewCount: 5,
  holdEnabled: true,
  maxHoldSlots: 1,
  gravityMs: 900,
  softDropGravityMs: 100,
  lockDelayMs: 500,
  maxLockResets: 15,
  fastChainWindowMs: 1000,
  fastStateThreshold: 3,
  ghostPieceEnabled: true,
  keepBackToBackOnEmptyTSpin: true,
};
