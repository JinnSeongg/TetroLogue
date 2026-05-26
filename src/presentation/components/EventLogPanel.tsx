import type { GameEvent } from "../../domain/shared/GameEvent";
import type { SpinResult } from "../../domain/tetris/SpinDetector";

type Props = {
  events: GameEvent[];
};

export function EventLogPanel({ events }: Props) {
  return (
    <section className="panel">
      <h2>Combat Log</h2>
      <ol className="event-log">
        {events.slice(-10).map((event, index) => (
          <li key={`${event.type}-${index}`}>{formatEvent(event)}</li>
        ))}
      </ol>
    </section>
  );
}

function formatEvent(event: GameEvent): string {
  if (event.type === "LineCleared") return `${event.lines} line cleared (${formatSpin(event.spinResult)})`;
  if (event.type === "SpinDetected") return `Spin ${formatSpin(event.spinResult)}`;
  if (event.type === "AttackCalculated") {
    return `${event.actionName ?? "Attack"}: ${event.totalDamage ?? event.finalAttack} damage`;
  }
  if (event.type === "EnemyDamaged") return `Enemy damaged ${event.damage}, HP ${event.remainingHp}`;
  if (event.type === "EnemyIntentChanged") return event.description;
  if (event.type === "GarbagePending") return `${event.lines} garbage pending`;
  if (event.type === "GarbageCanceled") return `Canceled ${event.canceledLines} garbage`;
  if (event.type === "GarbageApplied") return `${event.lines} garbage added`;
  if (event.type === "CombatDiagnostic") return event.message;
  if (event.type === "ComboChanged") return `Combo ${event.combo}`;
  if (event.type === "BackToBackChanged") return `Back-to-back ${event.active ? "on" : "off"}`;
  if (event.type === "RewardOffered") return "Reward offered";
  if (event.type === "RewardSelected") return `Reward selected ${event.rewardId}`;
  if (event.type === "PiecePlaced") return `Placed ${event.pieceType}`;
  if (event.type === "PieceSpawned") return `Spawned ${event.pieceType}`;
  if (event.type === "CombatEnded") return `Combat ended: ${event.result}`;
  return event.type;
}

function formatSpin(spinResult: SpinResult | undefined): string {
  if (!spinResult || spinResult.kind === "None") return "None";
  return `${spinResult.kind} ${spinResult.grade} ${spinResult.pieceType ?? ""}`.trim();
}
