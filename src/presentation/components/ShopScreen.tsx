import type { RewardState } from "../../domain/reward/RewardState";
import type { RelicDefinition } from "../../domain/relic/RelicDefinition";

type Props = {
  reward?: RewardState;
  relics: Record<string, RelicDefinition>;
  onSelect: (rewardId: string) => void;
  onLeave: () => void;
};

export function ShopScreen({ reward, relics, onSelect, onLeave }: Props) {
  return (
    <main className="reward-screen shop-screen">
      <section className="reward-panel">
        <p className="eyebrow">Shop</p>
        <h1>Pick a Relic</h1>
        <div className="reward-card-grid">
          {(reward?.choices ?? []).map((choice) => {
            const relic = relics[choice.relicId];
            return (
              <button className="reward-card shop-card" key={choice.id} onClick={() => onSelect(choice.id)}>
                <strong>{choice.label}</strong>
                <span>{relic?.description ?? "Adds a new modifier."}</span>
              </button>
            );
          })}
        </div>
        <div className="shop-actions">
          <button onClick={onLeave}>Leave Shop</button>
        </div>
      </section>
    </main>
  );
}
