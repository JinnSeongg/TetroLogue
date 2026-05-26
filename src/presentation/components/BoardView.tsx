import type { CSSProperties } from "react";
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

export function BoardView({
  board,
  activePiece,
  showGhostPiece = true,
  showGrid = true,
  visualClassName = "",
}: Props) {
  const ghostPiece = showGhostPiece ? new GhostPieceCalculator().calculate(board, activePiece) : undefined;
  const activeBlocks = new Set(activePiece?.blocks().map((block) => `${block.x},${block.y}`) ?? []);
  const visibleGhostBlocks = ghostPiece?.blocks().filter((block) => !activeBlocks.has(`${block.x},${block.y}`)) ?? [];
  const visibleActiveBlocks = activePiece?.blocks() ?? [];
  const cells = board.snapshot();

  const blockSize = {
    width: `${100 / board.width}%`,
    height: `${100 / board.height}%`,
  };

  return (
    <div
      className={`board ${showGrid ? "grid-visible" : "grid-hidden"} ${visualClassName}`}
      style={
        {
          gridTemplateColumns: `repeat(${board.width}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${board.height}, minmax(0, 1fr))`,
        } as CSSProperties
      }
    >
      {cells.flatMap((row, y) =>
        row.map((cell, x) => {
          const pieceType = cell.pieceType;
          const color = pieceType ? pieceColorPalette[pieceType] : undefined;

          const pieceStyle =
            color && cell.filled
              ? {
                  background: color.fill,
                  boxShadow: `inset 0 0 0 1px rgba(255, 255, 255, 0.18), 0 0 6px ${color.glow}`,
                }
              : undefined;

          return (
            <div
              key={`${x}-${y}`}
              className={`cell ${cell.filled ? "filled" : ""} ${cell.isGarbage ? "garbage" : ""}`}
              style={pieceStyle}
            />
          );
        }),
      )}

      {visibleGhostBlocks.map((block, index) => (
        <div
          key={`ghost-${block.x}-${block.y}-${index}`}
          className="cell piece-block ghost"
          style={{
            ...blockSize,
            transform: `translate(${block.x * 100}%, ${block.y * 100}%)`,
          }}
        />
      ))}

      {visibleActiveBlocks.map((block, index) => {
        const color = activePiece ? pieceColorPalette[activePiece.type] : undefined;

        return (
          <div
            key={`active-${block.x}-${block.y}-${index}`}
            className="cell piece-block filled active"
            style={{
              ...blockSize,
              transform: `translate(${block.x * 100}%, ${block.y * 100}%)`,
              ...(color
                ? {
                    background: color.fill,
                    border: "none",
                    outline: "none",
                    boxSizing: "border-box",
                    boxShadow: `
                      inset -1px 0 0 #0b0e11,
                      inset 0 -1px 0 #0b0e11,
                      0 0 6px ${color.glow}
                    `,
                  }
                : undefined),
            }}
          />
        );
      })}
    </div>
  );
}