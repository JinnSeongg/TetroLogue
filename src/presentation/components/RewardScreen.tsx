import type { RewardState } from "../../domain/reward/RewardState";
import type { RelicDefinition } from "../../domain/relic/RelicDefinition";

type Props = {
  reward: RewardState;
  relics: Record<string, RelicDefinition>;
  onSelect: (rewardId: string) => void;
};

export function RewardScreen({ reward, relics, onSelect }: Props) {
  return (
    <main className="reward-screen">
      <section className="reward-panel">
        <p className="eyebrow">Battle Reward</p>
        <h1>Choose a Relic</h1>
        <div className="reward-card-grid">
          {reward.choices.map((choice) => {
            const relic = relics[choice.relicId];
            return (
              <button className="reward-card" key={choice.id} onClick={() => onSelect(choice.id)}>
                <strong>{choice.label}</strong>
                <span>{relic?.description ?? "Adds a new modifier."}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
