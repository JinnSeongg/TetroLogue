import type { TetrominoType } from "./Cell";
import { ActivePiece } from "./ActivePiece";
import type { Board } from "./Board";
import type { TetrisRuleSet } from "./TetrisRuleSet";

export type PieceSpawnConfig = {
  originOffsetX: number;
  originOffsetY: number;
};

export const SPAWN_Y_OFFSET = -2;
export const VISIBLE_BUFFER_ROWS = 4;
export const INITIAL_SPAWN_DROP_ROWS = 1;

export const pieceSpawnConfig: Record<TetrominoType, PieceSpawnConfig> = {
  I: { originOffsetX: 0, originOffsetY: 0 },
  O: { originOffsetX: 0, originOffsetY: -1 },
  T: { originOffsetX: 0, originOffsetY: 0 },
  S: { originOffsetX: 0, originOffsetY: 0 },
  Z: { originOffsetX: 0, originOffsetY: 0 },
  J: { originOffsetX: 0, originOffsetY: 0 },
  L: { originOffsetX: 0, originOffsetY: 0 },
};

export function createSpawnPiece(type: TetrominoType, ruleSet: Pick<TetrisRuleSet, "boardWidth">): ActivePiece {
  const config = pieceSpawnConfig[type];
  return new ActivePiece(type, {
    x: Math.floor(ruleSet.boardWidth / 2) - 1 + config.originOffsetX,
    y: SPAWN_Y_OFFSET + config.originOffsetY,
  });
}

export function applyInitialSpawnDrop(board: Board, piece: ActivePiece): ActivePiece {
  void board;
  return piece.move(0, INITIAL_SPAWN_DROP_ROWS);
}

export function canEnterFromSpawn(board: Board, piece: ActivePiece): boolean {
  return board.canPlace(piece) && board.canPlace(piece.move(0, INITIAL_SPAWN_DROP_ROWS));
}

export function createEnteredSpawnPiece(type: TetrominoType, board: Board, ruleSet: Pick<TetrisRuleSet, "boardWidth">): ActivePiece {
  return applyInitialSpawnDrop(board, createSpawnPiece(type, ruleSet));
}

export function hasHiddenBlocks(piece: ActivePiece): boolean {
  return piece.blocks().some((block) => block.y < 0);
}
