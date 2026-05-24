import type { TetrominoType } from "../Cell";
import type { KickTable, KickTableProvider } from "./KickTable";
import type { RotationDirection } from "./RotationDirection";

export const srs180JlstzKickTable: KickTable = {
  "0>2": [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ],
  "R>L": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 2 },
    { x: 1, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: 1 },
  ],
  "2>0": [
    { x: 0, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ],
  "L>R": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -1, y: 2 },
    { x: -1, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: 1 },
  ],
};

export const srs180IKickTable: KickTable = {
  "0>2": [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
  ],
  "R>L": [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: -1 },
    { x: 0, y: -2 },
    { x: 1, y: 0 },
  ],
  "2>0": [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: -1, y: 0 },
    { x: -2, y: 0 },
    { x: 0, y: -1 },
  ],
  "L>R": [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: -1 },
    { x: 0, y: -2 },
    { x: -1, y: 0 },
  ],
};

export const srs180OKickTable: KickTable = {
  "0>2": [{ x: 0, y: 0 }],
  "R>L": [{ x: 0, y: 0 }],
  "2>0": [{ x: 0, y: 0 }],
  "L>R": [{ x: 0, y: 0 }],
};

export class Srs180KickTableProvider implements KickTableProvider {
  getKickTable(pieceType: TetrominoType, direction: RotationDirection): KickTable {
    if (direction !== "ONE_EIGHTY") return {};
    if (pieceType === "I") return srs180IKickTable;
    if (pieceType === "O") return srs180OKickTable;
    return srs180JlstzKickTable;
  }
}
