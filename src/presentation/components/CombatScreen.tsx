import type { GameAppState } from "../../application/GameAppState";
import { BoardView } from "./BoardView";
import { CombatHUD } from "./CombatHUD";
import { HoldRenderer } from "./HoldRenderer";
import { QueueRenderer } from "./QueueRenderer";
import { RelicPanel } from "./RelicPanel";
import type { PlayerSettings } from "../../application/settings/PlayerSettings";
import { CombatFeedbackPanel } from "./CombatFeedbackPanel";
import { AttackAnimationController } from "./AttackAnimationController";
import { ScreenShakeController } from "./ScreenShakeController";
import { DangerVisualController } from "./DangerVisualController";
import { GarbageGauge } from "./GarbageGauge";

type Props = {
  state: GameAppState;
  onDebugLineClear: (lines: number) => void;
  onReturnToMenu: () => void;
  devMode: boolean;
  settings: PlayerSettings;
};

export function CombatScreen({ state, onDebugLineClear, onReturnToMenu, devMode, settings }: Props) {
  const combat = state.combat;
  const garbagePreview = combat?.enemy.garbageQueue.getPreview();
  return (
    <AttackAnimationController event={combat?.lastFeedbackEvent}>
      {(attackAnimation) => (
        <ScreenShakeController event={combat?.lastFeedbackEvent} enabled={settings.video.screenShakeEnabled}>
          {(shakeStyle) => (
            <main className="app-shell combat-shell" style={shakeStyle}>
              <DangerVisualController dangerLevel={combat?.lastFeedbackEvent?.dangerLevel ?? "Safe"} incomingGarbageAmount={garbagePreview?.totalAmount ?? 0}>
                {(dangerVisual) => (
                  <div className="play-area-wrapper">
                    <header className="combat-top-bar">
                      <CombatHUD combat={combat} attackAnimation={attackAnimation} />
                      <button onClick={onReturnToMenu}>Menu</button>
                    </header>
                    <section className="combat-layout">
                      <aside className="combat-left">
                        <HoldRenderer holdSlot={combat?.player.holdSlot} />
                        <RelicPanel inventory={state.run?.relicInventory} compact />
                      </aside>
                      <section className="board-column">
                        {attackAnimation ? (
                          <div className={`attack-trail attack-${attackAnimation.variant} attack-${attackAnimation.intensity}`} aria-hidden="true">
                            <span>+{attackAnimation.attackAmount}</span>
                          </div>
                        ) : null}
                        {combat ? (
                          <div className="board-stage">
                            <GarbageGauge preview={garbagePreview} maxRows={combat.player.board.height} />
                            <BoardView
                              board={combat.player.board}
                              activePiece={combat.player.activePiece}
                              showGhostPiece={settings.video.ghostPieceEnabled}
                              showGrid={settings.video.gridVisible}
                              visualClassName={dangerVisual.boardClassName}
                            />
                          </div>
                        ) : null}
                      </section>
                      <aside className="combat-right">
                        <QueueRenderer nextPieces={combat?.player.nextPieces ?? []} />
                        <CombatFeedbackPanel event={combat?.lastFeedbackEvent} visibleMs={2200} />
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
                  </div>
                )}
              </DangerVisualController>
            </main>
          )}
        </ScreenShakeController>
      )}
    </AttackAnimationController>
  );
}
