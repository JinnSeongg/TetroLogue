import type { GameAppState } from "../../application/GameAppState";

type Props = {
  state: GameAppState;
  onDebugLineClear: (lines: number) => void;
};

export function DebugPanel({ state, onDebugLineClear }: Props) {
  return (
    <section className="panel">
      <h2>Debug</h2>
      <div className="debug-buttons">
        {[1, 2, 3, 4].map((lines) => (
          <button key={lines} onClick={() => onDebugLineClear(lines)} disabled={!state.combat || state.combat.result !== "ongoing"}>
            {lines} Line
          </button>
        ))}
      </div>
      <pre>{JSON.stringify({ run: state.run?.status, events: state.events.slice(-5) }, null, 2)}</pre>
    </section>
  );
}
