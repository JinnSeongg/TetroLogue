import type { HoldSlot } from "../../domain/tetris/HoldSlot";
import { PieceRenderer } from "./PieceRenderer";

type Props = {
  holdSlot?: HoldSlot;
};

export function HoldRenderer({ holdSlot }: Props) {
  return (
    <section className={`hold-panel ${holdSlot?.usedThisTurn ? "used" : ""}`}>
      <h2>Hold</h2>
      <PieceRenderer piece={holdSlot?.held} dimmed={holdSlot?.usedThisTurn} scale="large" label="Held piece" />
    </section>
  );
}
