import type { EnemyAttackWarningState } from "../../domain/combat/EnemyAttackWarningSelector";

type Props = {
  warning: EnemyAttackWarningState;
};

export function EnemyAttackWarningView({ warning }: Props) {
  const seconds =
    warning.nextAttackRemainingMs === null
      ? "-"
      : `${Math.max(0, warning.nextAttackRemainingMs / 1000).toFixed(1)}s`;

  return (
    <section className={`enemy-attack-warning enemy-attack-warning--${warning.dangerLevel}`} aria-label="Enemy attack warning">
      <strong>NEXT ATTACK</strong>
      <span>
        {warning.nextAttackRemainingMs === null ? "-" : `${warning.nextAttackLines} x ${seconds}`}
      </span>
      {warning.pendingGarbageLines > 0 ? <em>QUEUE {warning.pendingGarbageLines}</em> : null}
    </section>
  );
}
