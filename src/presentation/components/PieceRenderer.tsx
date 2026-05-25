import type { TetrominoType } from "../../domain/tetris/Cell";
import { tetrominoShapes } from "../../domain/tetris/Tetromino";
import { pieceColorPalette } from "../PieceColorPalette";

type Props = {
  piece?: TetrominoType;
  label?: string;
  dimmed?: boolean;
  scale?: "small" | "normal" | "large";
};

export function PieceRenderer({ piece, label, dimmed = false, scale = "normal" }: Props) {
  const blocks = piece ? normalizeBlocks(tetrominoShapes[piece]) : [];
  const color = piece ? pieceColorPalette[piece] : undefined;

  return (
    <div className={`piece-renderer ${scale} ${dimmed ? "dimmed" : ""}`} aria-label={label ?? piece ?? "Empty piece"}>
      {Array.from({ length: 16 }, (_, index) => {
        const x = index % 4;
        const y = Math.floor(index / 4);
        const filled = blocks.some((block) => block.x === x && block.y === y);
        return (
          <span
            key={index}
            className={`piece-cell ${filled ? "filled" : ""}`}
            style={
              filled && color
                ? {
                    background: color.fill,
                    boxShadow: `inset 0 0 0 1px rgba(255, 255, 255, 0.18), 0 0 8px ${color.glow}`,
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

function normalizeBlocks(blocks: Array<{ x: number; y: number }>) {
  const minX = Math.min(...blocks.map((block) => block.x));
  const minY = Math.min(...blocks.map((block) => block.y));
  const normalized = blocks.map((block) => ({ x: block.x - minX, y: block.y - minY }));
  const maxX = Math.max(...normalized.map((block) => block.x));
  const maxY = Math.max(...normalized.map((block) => block.y));
  const offsetX = Math.max(0, Math.floor((3 - maxX) / 2));
  const offsetY = Math.max(0, Math.floor((3 - maxY) / 2));
  return normalized.map((block) => ({ x: block.x + offsetX, y: block.y + offsetY }));
}
