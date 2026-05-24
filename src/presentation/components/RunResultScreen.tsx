import type { GameAppState } from "../../application/GameAppState";
import { RelicPanel } from "./RelicPanel";

type Props = {
  state: GameAppState;
  onStartRun: () => void;
  onReturnToMenu: () => void;
};

export function RunResultScreen({ state, onStartRun, onReturnToMenu }: Props) {
  const result = state.runResult;
  return (
    <main className="result-screen">
      <section className={`result-panel ${result?.result ?? "defeat"}`}>
        <p className="eyebrow">{result?.result === "victory" ? "Route Cleared" : "Run Ended"}</p>
        <h1>{result?.title ?? "Run Ended"}</h1>
        <p>{result?.message ?? "The run is over."}</p>
        <RelicPanel inventory={state.run?.relicInventory} />
        <div className="menu-actions">
          <button className="primary-button" onClick={onStartRun}>
            New Run
          </button>
          <button onClick={onReturnToMenu}>Main Menu</button>
        </div>
      </section>
    </main>
  );
}
