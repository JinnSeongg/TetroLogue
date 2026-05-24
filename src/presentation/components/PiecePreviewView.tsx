import type { TetrominoType } from "../../domain/tetris/Cell";

type Props = {
  nextPieces: TetrominoType[];
  hold?: TetrominoType;
};

export function PiecePreviewView({ nextPieces, hold }: Props) {
  return (
    <section className="panel">
      <h2>Pieces</h2>
      <div className="stat-row">
        <span>Hold</span>
        <strong>{hold ?? "-"}</strong>
      </div>
      <div className="preview-list">
        {nextPieces.map((piece, index) => (
          <span key={`${piece}-${index}`} className="piece-chip">
            {piece}
          </span>
        ))}
      </div>
    </section>
  );
}
