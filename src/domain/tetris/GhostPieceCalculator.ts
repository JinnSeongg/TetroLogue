import type { ActivePiece } from "./ActivePiece";
import type { Board } from "./Board";

const MAX_DROP_STEPS = 64;

export class GhostPieceCalculator {
  calculate(board: Board, activePiece?: ActivePiece): ActivePiece | undefined {
    if (!activePiece || !board.canPlace(activePiece)) return undefined;
    let ghost = activePiece;
    let steps = 0;

    while (steps < MAX_DROP_STEPS && board.canPlace(ghost.move(0, 1))) {
      ghost = ghost.move(0, 1);
      steps += 1;
    }

    return ghost;
  }
}
