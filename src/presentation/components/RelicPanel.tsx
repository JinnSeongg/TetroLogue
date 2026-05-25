import type { RelicInventory } from "../../domain/relic/RelicInventory";

type Props = {
  inventory?: RelicInventory;
  compact?: boolean;
};

export function RelicPanel({ inventory, compact = false }: Props) {
  const relics = inventory?.getDefinitions() ?? [];
  return (
    <section className={`panel relic-panel ${compact ? "compact" : ""}`}>
      <h2>Relics</h2>
      {relics.length === 0 ? <p className="muted">No relics yet</p> : null}
      {relics.map((relic) => (
        <article className="relic-item" key={relic.id} title={relic.description}>
          <span className="relic-icon" aria-hidden="true">
            R
          </span>
          <strong>{relic.name}</strong>
          {!compact ? <span>{relic.description}</span> : null}
        </article>
      ))}
    </section>
  );
}
