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

  return (
    <div className="combat-feedback-slot" aria-live="polite">
      <section key={current.eventId} className={`combat-feedback combat-feedback-${current.intensity}`}>
        <strong>{current.clearName}</strong>
        {current.attackAmount > 0 ? <span className="combat-feedback-damage">+{current.attackAmount}</span> : null}
      </section>
    </div>
  );
}
