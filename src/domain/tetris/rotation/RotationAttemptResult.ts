import type { ActivePiece } from "../ActivePiece";
import type { KickOffset } from "./KickOffset";
import type { RotationDirection } from "./RotationDirection";
import type { RotationState } from "./RotationState";
import type { RotationTransition } from "./RotationTransition";

export type LastRotation = {
  pieceType: string;
  direction: RotationDirection;
  from: RotationState;
  to: RotationState;
  usedKickIndex?: number;
  usedKickOffset?: KickOffset;
  success: boolean;
};

export type RotationAttemptResult =
  | {
      success: true;
      piece: ActivePiece;
      direction: RotationDirection;
      from: RotationState;
      to: RotationState;
      transition: RotationTransition;
      usedKickIndex: number;
      usedKickOffset: KickOffset;
    }
  | {
      success: false;
      piece: ActivePiece;
      direction: RotationDirection;
      from: RotationState;
      to: RotationState;
      transition: RotationTransition;
    };
