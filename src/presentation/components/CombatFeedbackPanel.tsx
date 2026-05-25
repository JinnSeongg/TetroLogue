import { useEffect, useState } from "react";
import type { CombatFeedbackEvent } from "../../domain/combat/CombatFeedbackEvent";

type Props = {
  event?: CombatFeedbackEvent;
  visibleMs?: number;
};

type VisibleFeedback = {
  event: CombatFeedbackEvent;
};

export function CombatFeedbackPanel({ event, visibleMs = 1400 }: Props) {
  const [feedback, setFeedback] = useState<VisibleFeedback | null>(null);

  useEffect(() => {
    if (!event || event.intensity === "none") return;
    setFeedback({ event });
    const timeout = window.setTimeout(() => setFeedback(null), visibleMs);
    return () => window.clearTimeout(timeout);
  }, [event, visibleMs]);

  if (!feedback) return <div className="combat-feedback-slot" aria-live="polite" />;

  const current = feedback.event;
  const details = [
    current.attackAmount > 0 ? `+${current.attackAmount} Attack` : undefined,
    current.offsetAmount > 0 ? `Offset ${current.offsetAmount}` : undefined,
    current.isComboActive ? `Combo ${current.comboCount}` : undefined,
    current.isBackToBack ? `Back-to-Back${current.backToBackCount > 1 ? ` ${current.backToBackCount}` : ""}` : undefined,
    current.isPerfectClear ? "Perfect Clear" : undefined,
  ].filter(Boolean);

  return (
    <div className="combat-feedback-slot" aria-live="polite">
      <section key={current.eventId} className={`combat-feedback combat-feedback-${current.intensity}`}>
        <strong>{current.clearName}</strong>
        {details.length > 0 ? <div className="combat-feedback-details">{details.map((detail) => <span key={detail}>{detail}</span>)}</div> : null}
      </section>
    </div>
  );
}
