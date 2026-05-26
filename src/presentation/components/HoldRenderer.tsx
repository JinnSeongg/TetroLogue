import type { HoldSlot } from "../../domain/tetris/HoldSlot";
import { PieceRenderer } from "./PieceRenderer";

type Props = {
  holdSlot?: HoldSlot;
};

export function HoldRenderer({ holdSlot }: Props) {
  const slots = holdSlot?.maxHoldSlots === 2 ? [holdSlot.holdSlots[0], holdSlot.holdSlots[1]] : [holdSlot?.held];
  return (
    <section className={`hold-panel ${holdSlot?.usedThisTurn ? "used" : ""} ${holdSlot?.maxHoldSlots === 2 ? "multi" : ""}`}>
      <h2>Hold</h2>
      <div className="hold-slot-list">
        {slots.map((piece, index) => (
          <div key={index} className={`hold-slot ${piece ? "" : "empty"}`}>
            <PieceRenderer piece={piece} dimmed={holdSlot?.usedThisTurn} scale={holdSlot?.maxHoldSlots === 2 ? "small" : "large"} label={`Hold ${index + 1}`} />
          </div>
        ))}
      </div>
    </section>
  );
}
