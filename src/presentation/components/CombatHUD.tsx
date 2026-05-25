import type { CombatState } from "../../domain/combat/CombatState";
import type { AttackAnimationState } from "./AttackAnimationController";

type Props = {
  combat?: CombatState;
  attackAnimation?: AttackAnimationState;
};

export function CombatHUD({ combat, attackAnimation }: Props) {
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
            <div style={{ width: `${(combat.enemy.hp / combat.enemy.definition.maxHp) * 100}%` }} />
          </div>
          <span className="enemy-hp">
            {combat.enemy.hp}/{combat.enemy.definition.maxHp}
          </span>
        </>
      ) : (
        <p className="muted">No combat</p>
      )}
    </section>
  );
}
