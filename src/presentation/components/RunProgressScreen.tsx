import type { RunState } from "../../domain/run/RunState";
import { FloorLabel } from "./FloorLabel";
import { LinearNodeChain } from "./LinearNodeChain";
import { RelicPanel } from "./RelicPanel";

type Props = {
  run?: RunState;
  onEnterNode: (nodeId: string) => void;
  onReturnToMenu: () => void;
  onOpenSettings: () => void;
};

export function RunProgressScreen({ run, onEnterNode, onReturnToMenu, onOpenSettings }: Props) {
  if (!run) return null;
  return (
    <main className="app-shell run-progress-shell">
      <header className="run-progress-header">
        <FloorLabel floor={run.progress.currentFloor} />
        <div className="run-progress-actions">
          <button onClick={onOpenSettings}>Settings</button>
          <button onClick={onReturnToMenu}>Menu</button>
        </div>
      </header>
      <section className="run-progress-layout">
        <aside className="run-relic-column">
          <RelicPanel inventory={run.relicInventory} compact />
        </aside>
        <section className="run-chain-stage">
          <LinearNodeChain progress={run.progress} onEnterNode={onEnterNode} />
        </section>
      </section>
    </main>
  );
}
