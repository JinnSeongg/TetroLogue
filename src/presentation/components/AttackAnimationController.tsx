import { useEffect, useState, type ReactNode } from "react";
import type { CombatFeedbackEvent, CombatFeedbackIntensity } from "../../domain/combat/CombatFeedbackEvent";

export type AttackAnimationVariant = "basic" | "tetris" | "tSpin" | "backToBack" | "perfectClear";

export type AttackAnimationState = {
  id: string;
  attackAmount: number;
  intensity: CombatFeedbackIntensity;
  variant: AttackAnimationVariant;
  impacting: boolean;
};

type Props = {
  event?: CombatFeedbackEvent;
  impactDelayMs?: number;
  durationMs?: number;
  onImpact?: (animation: AttackAnimationState) => void;
  children: (animation?: AttackAnimationState) => ReactNode;
};

export function AttackAnimationController({ event, impactDelayMs = 180, durationMs = 620, onImpact, children }: Props) {
  const [animation, setAnimation] = useState<AttackAnimationState | undefined>();

  useEffect(() => {
    if (!event || event.attackAmount < 1) return;
    const next: AttackAnimationState = {
      id: event.eventId,
      attackAmount: event.attackAmount,
      intensity: event.intensity,
      variant: getAttackAnimationVariant(event),
      impacting: false,
    };
    setAnimation(next);

    const impactTimeout = window.setTimeout(() => {
      const impacted = { ...next, impacting: true };
      setAnimation(impacted);
      onImpact?.(impacted);
    }, impactDelayMs);
    const clearTimeout = window.setTimeout(() => setAnimation(undefined), durationMs);

    return () => {
      window.clearTimeout(impactTimeout);
      window.clearTimeout(clearTimeout);
    };
  }, [event, impactDelayMs, durationMs, onImpact]);

  return <>{children(animation)}</>;
}

export function getAttackAnimationVariant(event: CombatFeedbackEvent): AttackAnimationVariant {
  if (event.isPerfectClear) return "perfectClear";
  if (event.clearName.includes("T-Spin")) return "tSpin";
  if (event.isBackToBack) return "backToBack";
  if (event.clearName === "Tetris") return "tetris";
  return "basic";
}
