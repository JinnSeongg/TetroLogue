import type { TetrominoType } from "../../domain/tetris/Cell";
import { PieceRenderer } from "./PieceRenderer";

type Props = {
  nextPieces: TetrominoType[];
};

export function QueueRenderer({ nextPieces }: Props) {
  return (
    <section className="queue-panel">
      <h2>Next</h2>
      <div className="queue-list">
        {nextPieces.slice(0, 5).map((piece, index) => (
          <div key={`${piece}-${index}`} className="queue-piece" style={{ opacity: 1 - index * 0.11, transform: `scale(${1 - index * 0.035})` }}>
            <PieceRenderer piece={piece} scale={index === 0 ? "large" : "normal"} />
          </div>
        ))}
      </div>
    </section>
  );
}
