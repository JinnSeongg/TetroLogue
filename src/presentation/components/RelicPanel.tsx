import type { RelicInventory } from "../../domain/relic/RelicInventory";

type Props = {
  inventory?: RelicInventory;
};

export function RelicPanel({ inventory }: Props) {
  const relics = inventory?.getDefinitions() ?? [];
  return (
    <section className="panel">
      <h2>Relics</h2>
      {relics.length === 0 ? <p className="muted">No relics yet</p> : null}
      {relics.map((relic) => (
        <article className="relic-item" key={relic.id}>
          <strong>{relic.name}</strong>
          <span>{relic.description}</span>
        </article>
      ))}
    </section>
  );
}
