import type { GarbagePreviewModel } from "../../domain/combat/GarbageQueue";

type Props = {
  preview?: GarbagePreviewModel;
  maxRows?: number;
};

export function GarbageGauge({ preview, maxRows = 20 }: Props) {
  const totalAmount = preview?.totalAmount ?? 0;
  const readyAmount = preview?.readyAmount ?? 0;
  const fillRatio = maxRows <= 0 ? 0 : Math.min(1, totalAmount / maxRows);
  const readyRatio = totalAmount <= 0 ? 0 : Math.min(1, readyAmount / totalAmount);
  const level = garbageLevel(totalAmount, maxRows);

  return (
    <aside
      className={`garbage-gauge garbage-gauge-${level}`}
      aria-label={`Incoming garbage ${totalAmount} lines${readyAmount > 0 ? `, ${readyAmount} ready` : ""}`}
      title={`Incoming garbage: ${totalAmount}`}
    >
      <div className="garbage-gauge-track">
        <div className="garbage-gauge-fill" style={{ height: `${fillRatio * 100}%` }}>
          {readyRatio > 0 ? <span className="garbage-gauge-ready" style={{ height: `${readyRatio * 100}%` }} /> : null}
        </div>
      </div>
    </aside>
  );
}

function garbageLevel(totalAmount: number, maxRows: number): "empty" | "low" | "medium" | "high" {
  if (totalAmount <= 0) return "empty";
  if (totalAmount >= maxRows * 0.6) return "high";
  if (totalAmount >= maxRows * 0.35) return "medium";
  return "low";
}
