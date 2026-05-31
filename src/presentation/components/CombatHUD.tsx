import { useEffect, useState } from "react";
import type { CombatState } from "../../domain/combat/CombatState";
import type { AttackAnimationState } from "./AttackAnimationController";

type Props = {
  combat?: CombatState;
  attackAnimation?: AttackAnimationState;
  damageVisibleMs?: number;
};

type DamageFeedback = {
  eventId: string;
  damage: number;
};

export function CombatHUD({ combat, attackAnimation, damageVisibleMs = 2100 }: Props) {
  const [damageFeedback, setDamageFeedback] = useState<DamageFeedback | null>(null);
  const feedbackEvent = combat?.lastFeedbackEvent;

  useEffect(() => {
    if (!feedbackEvent || feedbackEvent.damageDealtToEnemy < 1) return;
    setDamageFeedback({ eventId: feedbackEvent.eventId, damage: feedbackEvent.damageDealtToEnemy });
    const timeout = window.setTimeout(() => setDamageFeedback(null), damageVisibleMs);
    return () => window.clearTimeout(timeout);
  }, [feedbackEvent, damageVisibleMs]);

  const statusBadges = combat
    ? [
        combat.player.backToBackActive
          ? { key: "b2b", label: "B2B", value: combat.player.backToBackCount, className: "b2b" }
          : undefined,
        combat.player.combo > 1
          ? { key: "combo", label: "COMBO", value: combat.player.comboDisplayCount || combat.player.combo, className: "combo" }
          : undefined,
        combat.player.isFastState
          ? { key: "speed", label: "SPEED", value: combat.player.fastChainCount, className: "speed" }
          : undefined,
      ].filter((badge): badge is { key: string; label: string; value: number; className: string } => Boolean(badge))
    : [];

  return (
    <section
      className={`combat-hud ${attackAnimation ? `attack-${attackAnimation.variant} attack-${attackAnimation.intensity}` : ""} ${
        attackAnimation?.impacting ? "impacting" : ""
      }`}
      aria-label="Enemy status"
    >
      {combat ? (
        <>
          <strong className="enemy-name">{combat.enemy.definition.name}</strong>
          <div className="hp-bar">
            <div style={{ width: `${(combat.enemy.hp / combat.enemy.maxHp) * 100}%` }} />
          </div>
          <span className="enemy-hp">
            {combat.enemy.hp}/{combat.enemy.maxHp}
          </span>
          {damageFeedback ? (
            <span key={damageFeedback.eventId} className="enemy-damage-float" aria-label={`Enemy damaged ${damageFeedback.damage}`}>
              -{damageFeedback.damage}
            </span>
          ) : null}
          <div className="combat-status-badges" aria-label="Active combat bonuses">
            {statusBadges.map((badge) => (
              <span key={badge.key} className={`combat-status-badge combat-status-badge-${badge.className}`}>
                <strong>{badge.label}</strong>
                <em>x{badge.value}</em>
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">No combat</p>
      )}
    </section>
  );
}
