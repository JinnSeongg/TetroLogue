import type { TetrominoType } from "../domain/tetris/Cell";

export type PieceColor = {
  fill: string;
  glow: string;
};

export const pieceColorPalette: Record<TetrominoType, PieceColor> = {
  I: { fill: "#76dbe8", glow: "rgba(118, 219, 232, 0.34)" },
  O: { fill: "#f2d978", glow: "rgba(242, 217, 120, 0.32)" },
  T: { fill: "#c99bea", glow: "rgba(201, 155, 234, 0.34)" },
  S: { fill: "#8fdda1", glow: "rgba(143, 221, 161, 0.32)" },
  Z: { fill: "#ee8d95", glow: "rgba(238, 141, 149, 0.32)" },
  J: { fill: "#8fb1ee", glow: "rgba(143, 177, 238, 0.34)" },
  L: { fill: "#edbb7d", glow: "rgba(237, 187, 125, 0.32)" },
};
