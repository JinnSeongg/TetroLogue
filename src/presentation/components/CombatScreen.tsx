import type { GameAppState, PlayerInput } from "../../application/GameAppState";
import { BoardView } from "./BoardView";
import { CombatHUD } from "./CombatHUD";
import { EventLogPanel } from "./EventLogPanel";
import { PiecePreviewView } from "./PiecePreviewView";
import { RelicPanel } from "./RelicPanel";
import type { PlayerSettings } from "../../application/settings/PlayerSettings";
import type { InitialActionState } from "../../application/input/InitialActionState";
import { SettingsPanel } from "./SettingsPanel";
import { standardRuleSet } from "../../domain/tetris/TetrisRuleSet";

type Props = {
  state: GameAppState;
  onInput: (input: PlayerInput, nowMs?: number, bufferable?: boolean, initialAction?: InitialActionState) => void;
  onDebugLineClear: (lines: number) => void;
  onReturnToMenu: () => void;
  devMode: boolean;
  settings: PlayerSettings;
  onSettingsChange: (settings: PlayerSettings) => void;
};

export function CombatScreen({ state, onInput, onDebugLineClear, onReturnToMenu, devMode, settings, onSettingsChange }: Props) {
  const combat = state.combat;
  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Combat</p>
          <h1>{combat?.enemy.definition.name ?? "Encounter"}</h1>
        </div>
        <button onClick={onReturnToMenu}>Menu</button>
      </header>
      <section className="combat-layout">
        <aside className="side-panel">
          <CombatHUD combat={combat} />
          <RelicPanel inventory={state.run?.relicInventory} />
        </aside>
        <section className="board-column">
          {combat ? (
            <BoardView board={combat.player.board} activePiece={combat.player.activePiece} showGhostPiece={standardRuleSet.ghostPieceEnabled} />
          ) : null}
          <div className="controls-row">
            <button onClick={() => onInput("moveLeft")}>Left</button>
            <button onClick={() => onInput("rotateCounterClockwise")}>Z Rotate</button>
            <button onClick={() => onInput("rotateClockwise")}>X Rotate</button>
            <button onClick={() => onInput("rotate180")}>A 180</button>
            <button onClick={() => onInput("moveRight")}>Right</button>
            <button className="primary-button" onClick={() => onInput("hardDrop")}>
              Hard Drop
            </button>
            <button onClick={() => onInput("hold")}>Hold</button>
          </div>
        </section>
        <aside className="side-panel">
          <PiecePreviewView nextPieces={combat?.player.nextPieces ?? []} hold={combat?.player.hold} />
          <SettingsPanel settings={settings} onChange={onSettingsChange} />
          <EventLogPanel events={combat?.log ?? state.events} />
          {devMode ? (
            <section className="panel">
              <h2>Developer Tools</h2>
              <div className="debug-buttons">
                {[1, 2, 3, 4].map((lines) => (
                  <button key={lines} onClick={() => onDebugLineClear(lines)} disabled={!combat || combat.result !== "ongoing"}>
                    {lines} Line
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
