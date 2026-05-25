import { useMemo, useState } from "react";
import type { GameAppState, PlayerInput } from "../application/GameAppState";
import { BrowserInputAdapter } from "../infrastructure/BrowserInputAdapter";
import { LocalStorageSaveRepository } from "../infrastructure/LocalStorageSaveRepository";
import { BrowserRandomProvider } from "../infrastructure/BrowserRandomProvider";
import { GameScreen } from "./components/GameScreen";
import { GameFlowController } from "../application/GameFlowController";
import { isDevModeEnabled } from "../infrastructure/DevModeConfig";
import { LocalStoragePlayerSettingsRepository } from "../infrastructure/LocalStoragePlayerSettingsRepository";
import { LoadPlayerSettingsUseCase } from "../application/settings/LoadPlayerSettingsUseCase";
import { SavePlayerSettingsUseCase } from "../application/settings/SavePlayerSettingsUseCase";
import type { PlayerSettings } from "../application/settings/PlayerSettings";
import type { InitialActionState } from "../application/input/InitialActionState";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";

export function App() {
  const random = useMemo(() => new BrowserRandomProvider(), []);
  const inputAdapter = useMemo(() => new BrowserInputAdapter(), []);
  const devMode = useMemo(() => isDevModeEnabled(), []);
  const controller = useMemo(() => new GameFlowController(random, new LocalStorageSaveRepository()), [random]);
  const settingsRepository = useMemo(() => new LocalStoragePlayerSettingsRepository(), []);
  const [state, setState] = useState<GameAppState>(() => controller.createInitialState());
  const [settings, setSettings] = useState<PlayerSettings>(() => new LoadPlayerSettingsUseCase(settingsRepository).execute());

  const startRun = () => setState(controller.startRun());
  const continueRun = () => setState(controller.continueRun());
  const returnToMenu = () => setState(controller.returnToMenu());
  const handleInput = (input: PlayerInput, nowMs = performance.now(), bufferable = true, initialAction?: InitialActionState) =>
    setState((current) => controller.handleInput(current, input, nowMs, bufferable, initialAction));
  const tickCombat = (deltaMs: number, softDropPressed: boolean, nowMs = performance.now(), initialAction?: InitialActionState) =>
    setState((current) =>
      controller.tickCombat(current, deltaMs, softDropPressed, nowMs, initialAction, {
        ...standardRuleSet,
        softDropGravityMs: settings.input.softDropGravityMs,
        ghostPieceEnabled: settings.video.ghostPieceEnabled,
      }),
    );
  const saveSettings = (next: PlayerSettings) => {
    setSettings(new SavePlayerSettingsUseCase(settingsRepository).execute(next));
  };
  const debugLineClear = (lines: number) => setState((current) => controller.debugLineClear(current, lines));
  const selectReward = (rewardId: string) => setState((current) => controller.selectReward(current, rewardId));
  const moveToNode = (nodeId: string) => setState((current) => controller.enterNode(current, nodeId));
  const completeCurrentNode = () => setState((current) => controller.completeCurrentNode(current));

  return (
    <GameScreen
      state={state}
      inputAdapter={inputAdapter}
      onInput={handleInput}
      onTickCombat={tickCombat}
      onStartRun={startRun}
      onContinueRun={continueRun}
      onDebugLineClear={debugLineClear}
      onSelectReward={selectReward}
      onMoveToNode={moveToNode}
      onCompleteCurrentNode={completeCurrentNode}
      onReturnToMenu={returnToMenu}
      devMode={devMode}
      settings={settings}
      onSettingsChange={saveSettings}
    />
  );
}
