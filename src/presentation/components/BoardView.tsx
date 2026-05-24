import type { ActivePiece } from "../../domain/tetris/ActivePiece";
import type { Board } from "../../domain/tetris/Board";
import { GhostPieceCalculator } from "../../domain/tetris/GhostPieceCalculator";

type Props = {
  board: Board;
  activePiece?: ActivePiece;
  showGhostPiece?: boolean;
};

export function BoardView({ board, activePiece, showGhostPiece = true }: Props) {
  const ghostPiece = showGhostPiece ? new GhostPieceCalculator().calculate(board, activePiece) : undefined;
  const activeBlocks = new Set(activePiece?.blocks().map((block) => `${block.x},${block.y}`) ?? []);
  const ghostBlocks = new Set(ghostPiece?.blocks().map((block) => `${block.x},${block.y}`) ?? []);
  const cells = board.snapshot();

  return (
    <div
      className="board"
      style={{
        gridTemplateColumns: `repeat(${board.width}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${board.height}, minmax(0, 1fr))`,
      }}
    >
      {cells.flatMap((row, y) =>
        row.map((cell, x) => {
          const active = activeBlocks.has(`${x},${y}`);
          const ghost = !active && ghostBlocks.has(`${x},${y}`);
          return (
            <div
              key={`${x}-${y}`}
              className={`cell ${cell.filled || active ? "filled" : ""} ${active ? "active" : ""} ${ghost ? "ghost" : ""}`}
            />
          );
        }),
      )}
    </div>
  );
}
