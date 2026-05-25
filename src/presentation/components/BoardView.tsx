import type { ActivePiece } from "../../domain/tetris/ActivePiece";
import type { Board } from "../../domain/tetris/Board";
import { GhostPieceCalculator } from "../../domain/tetris/GhostPieceCalculator";
import { pieceColorPalette } from "../PieceColorPalette";

type Props = {
  board: Board;
  activePiece?: ActivePiece;
  showGhostPiece?: boolean;
  showGrid?: boolean;
  visualClassName?: string;
};

export function BoardView({ board, activePiece, showGhostPiece = true, showGrid = true, visualClassName = "" }: Props) {
  const ghostPiece = showGhostPiece ? new GhostPieceCalculator().calculate(board, activePiece) : undefined;
  const activeBlocks = new Set(activePiece?.blocks().map((block) => `${block.x},${block.y}`) ?? []);
  const ghostBlocks = new Set(ghostPiece?.blocks().map((block) => `${block.x},${block.y}`) ?? []);
  const cells = board.snapshot();

  return (
    <div
      className={`board ${showGrid ? "grid-visible" : "grid-hidden"} ${visualClassName}`}
      style={{
        gridTemplateColumns: `repeat(${board.width}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${board.height}, minmax(0, 1fr))`,
      }}
    >
      {cells.flatMap((row, y) =>
        row.map((cell, x) => {
          const active = activeBlocks.has(`${x},${y}`);
          const ghost = !active && ghostBlocks.has(`${x},${y}`);
          const pieceType = active ? activePiece?.type : cell.pieceType;
          const color = pieceType ? pieceColorPalette[pieceType] : undefined;
          const pieceStyle =
            color && (cell.filled || active)
              ? {
                  background: color.fill,
                  boxShadow: `inset 0 0 0 1px rgba(255, 255, 255, 0.18), 0 0 ${active ? "12px" : "6px"} ${color.glow}`,
                }
              : undefined;
          return (
            <div
              key={`${x}-${y}`}
              className={`cell ${cell.filled || active ? "filled" : ""} ${active ? "active" : ""} ${ghost ? "ghost" : ""} ${cell.isGarbage ? "garbage" : ""}`}
              style={pieceStyle}
            />
          );
        }),
      )}
    </div>
  );
}
