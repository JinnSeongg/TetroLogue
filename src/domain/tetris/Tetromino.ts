import type { TetrominoType } from "./Cell";

export type Point = { x: number; y: number };

export type Tetromino = {
  type: TetrominoType;
  blocks: Point[];
};

export const tetrominoShapes: Record<TetrominoType, Point[]> = {
  I: [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ],
  O: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  T: [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
  ],
  S: [
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 0 },
    { x: 0, y: 0 },
  ],
  Z: [
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  J: [
    { x: -1, y: -1 },
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  L: [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: -1 },
  ],
};
