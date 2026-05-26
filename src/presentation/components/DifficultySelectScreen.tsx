import { difficultyDefinitions } from "../../data/difficultyDefinitions";
import type { DifficultyId } from "../../domain/balance/balanceTypes";
import type { KeyboardEvent } from "react";

type DifficultyOption = {
  id: DifficultyId;
  targetSkill: string;
};

const difficultyOptions: DifficultyOption[] = [
  { id: "explorer", targetSkill: "D-C" },
  { id: "standard", targetSkill: "B-A" },
  { id: "advanced", targetSkill: "S+" },
  { id: "master", targetSkill: "SS-U" },
  { id: "void", targetSkill: "X+ / records" },
];

type Props = {
  onSelect: (difficultyId: DifficultyId) => void;
  onBack: () => void;
};

export function DifficultySelectScreen({ onSelect, onBack }: Props) {
  const selectDifficulty = (difficultyId: DifficultyId) => {
    onSelect(difficultyId);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, difficultyId: DifficultyId) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectDifficulty(difficultyId);
  };

  return (
    <main className="menu-screen">
      <section className="difficulty-panel">
        <div className="difficulty-header">
          <div>
            <p className="eyebrow">New Run</p>
            <h1>Choose Difficulty</h1>
          </div>
          <button onClick={onBack}>Back</button>
        </div>
        <div className="difficulty-grid">
          {difficultyOptions.map((option) => {
            const difficulty = difficultyDefinitions[option.id];
            const recommended = option.id === "standard";
            return (
              <article
                aria-label={`Select ${difficulty.name} difficulty`}
                className={`difficulty-card ${recommended ? "recommended" : ""}`}
                key={option.id}
                onClick={() => selectDifficulty(option.id)}
                onKeyDown={(event) => handleCardKeyDown(event, option.id)}
                role="button"
                tabIndex={0}
              >
                <div>
                  <div className="difficulty-title-row">
                    <h2>{difficulty.name}</h2>
                    {recommended ? <span>Recommended</span> : null}
                  </div>
                  <p className="difficulty-target">{option.targetSkill}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
