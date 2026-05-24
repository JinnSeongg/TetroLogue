export type Cell = {
  filled: boolean;
  pieceType?: TetrominoType;
  isGarbage?: boolean;
};

export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export const emptyCell = (): Cell => ({ filled: false });
