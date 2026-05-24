import type { Board } from "./Board";
import type { ActivePiece } from "./ActivePiece";
import type { AttackResult } from "../combat/AttackTypes";
import { createBaseAttackResult } from "../combat/attack/AttackResultFactory";
import { LineClearDetector } from "./LineClearDetector";
import { PerfectClearDetector } from "./PerfectClearDetector";
import { SrsSpinDetector, type LastSpinAction, type SpinResult } from "./SpinDetector";

export type LockResult = {
  board: Board;
  linesCleared: number;
  clearedRows: number[];
  spinResult: SpinResult;
  attackResult?: AttackResult;
};

export class LockSystem {
  constructor(
    private readonly lineClearDetector = new LineClearDetector(),
    private readonly spinDetector = new SrsSpinDetector(),
    private readonly perfectClearDetector = new PerfectClearDetector(),
  ) {}

  lock(board: Board, piece: ActivePiece, lastSpinAction?: LastSpinAction): LockResult {
    const spinResult = this.spinDetector.detect(board, piece, lastSpinAction);
    const placed = board.place(piece);
    const lineClearResult = this.lineClearDetector.detectAndClear(placed);
    const attackResult = createBaseAttackResult({
      lineClearCount: lineClearResult.linesCleared,
      spinResult,
      isPerfectClear: this.perfectClearDetector.isPerfectClear(lineClearResult.board),
    });
    return { ...lineClearResult, spinResult, attackResult };
  }
}
