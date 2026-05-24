import type { TetrominoType } from "../Cell";
import type { KickOffset } from "./KickOffset";
import type { RotationDirection } from "./RotationDirection";
import type { RotationTransition } from "./RotationTransition";

export type KickTable = Partial<Record<RotationTransition, KickOffset[]>>;

export type RotationKickTables = {
  standard: KickTable;
  i: KickTable;
  o: KickTable;
};

export interface KickTableProvider {
  getKickTable(pieceType: TetrominoType, direction: RotationDirection): KickTable;
}
