import type { RewardState } from "../../domain/reward/RewardState";
import type { RelicDefinition } from "../../domain/relic/RelicDefinition";

type Props = {
  reward: RewardState;
  relics: Record<string, RelicDefinition>;
  onSelect: (rewardId: string) => void;
  eyebrow?: string;
  title?: string;
};

export function RewardScreen({ reward, relics, onSelect, eyebrow = "Battle Reward", title = "Choose a Relic" }: Props) {
  return (
    <main className="reward-screen">
      <section className="reward-panel">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
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
