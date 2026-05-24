import type { CombatState } from "../../domain/combat/CombatState";

type Props = {
  combat?: CombatState;
};

export function CombatHUD({ combat }: Props) {
  const garbagePreview = combat?.enemy.garbageQueue.getPreview();

  return (
    <section className="panel">
      <h2>Combat</h2>
      {combat ? (
        <>
          <div className="stat-row">
            <span>Enemy</span>
            <strong>{combat.enemy.definition.name}</strong>
          </div>
          <div className="hp-bar">
            <div style={{ width: `${(combat.enemy.hp / combat.enemy.definition.maxHp) * 100}%` }} />
          </div>
          <div className="stat-row">
            <span>HP</span>
            <strong>
              {combat.enemy.hp}/{combat.enemy.definition.maxHp}
            </strong>
          </div>
          <div className="stat-row">
            <span>Status</span>
            <strong>{combat.result}</strong>
          </div>
          <div className="stat-row">
            <span>Last Attack</span>
            <strong>{combat.lastAttack ?? 0}</strong>
          </div>
          <div className="stat-row">
            <span>Combo</span>
            <strong>{combat.player.combo}</strong>
          </div>
          <div className="stat-row">
            <span>B2B</span>
            <strong>{combat.player.backToBackActive ? "On" : "Off"}</strong>
          </div>
          <div className="stat-row">
            <span>Intent</span>
            <strong>
              {combat.enemy.currentIntent?.garbageLines
                ? `${combat.enemy.currentIntent.garbageLines}G in ${Math.max(0, combat.enemy.currentIntent.dueActionCount - combat.player.actionCount)}`
                : "-"}
            </strong>
          </div>
          <div className="stat-row">
            <span>Pending Garbage</span>
            <strong>{garbagePreview?.totalAmount ?? 0}</strong>
          </div>
          <div className="stat-row">
            <span>Ready Garbage</span>
            <strong>{garbagePreview?.readyAmount ?? 0}</strong>
          </div>
          <div className="stat-row">
            <span>Garbage Queue</span>
            <strong>
              {garbagePreview?.packets.length
                ? garbagePreview.packets.map((packet) => `${packet.amount}G/${Math.max(0, packet.remainingDelay)}`).join(" ")
                : "-"}
            </strong>
          </div>
        </>
      ) : (
        <p className="muted">No combat</p>
      )}
    </section>
  );
}
