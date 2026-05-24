import type { Board } from "./Board";
import type { ActivePiece } from "./ActivePiece";

export class MovementSystem {
  tryMove(board: Board, piece: ActivePiece, dx: number, dy: number): ActivePiece {
    const moved = piece.move(dx, dy);
    return board.canPlace(moved) ? moved : piece;
  }
}
