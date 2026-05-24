import { useEffect, useRef } from "react";
import type { GameAppState, PlayerInput } from "../../application/GameAppState";
import type { BrowserInputAdapter } from "../../infrastructure/BrowserInputAdapter";
import { relicDefinitions } from "../../data/relicDefinitions";
import type { InputState } from "../../application/input/InputState";
import { createInputState } from "../../application/input/InputState";
import { initialActionFromInputState, type InitialActionState } from "../../application/input/InitialActionState";
import type { PlayerSettings } from "../../application/settings/PlayerSettings";
import { MovementRepeater } from "../../application/input/MovementRepeater";
import { BrowserKeyboardStateAdapter } from "../../infrastructure/BrowserKeyboardStateAdapter";
import { CombatScreen } from "./CombatScreen";
import { MainMenuScreen } from "./MainMenuScreen";
import { NodeMapView } from "./NodeMapView";
import { RelicPanel } from "./RelicPanel";
import { RewardScreen } from "./RewardScreen";
import { RunResultScreen } from "./RunResultScreen";

type Props = {
  state: GameAppState;
  inputAdapter: BrowserInputAdapter;
  onInput: (input: PlayerInput, nowMs?: number, bufferable?: boolean, initialAction?: InitialActionState) => void;
  onTickCombat: (deltaMs: number, softDropPressed: boolean, nowMs?: number, initialAction?: InitialActionState) => void;
  onStartRun: () => void;
  onContinueRun: () => void;
  onDebugLineClear: (lines: number) => void;
  onSelectReward: (rewardId: string) => void;
  onMoveToNode: (nodeId: string) => void;
  onReturnToMenu: () => void;
  devMode: boolean;
  settings: PlayerSettings;
  onSettingsChange: (settings: PlayerSettings) => void;
};

export function GameScreen(props: Props) {
  const inputStateRef = useRef<InputState>(createInputState());
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    if (props.state.scene !== "combat") return;
    const keyboardStateAdapter = new BrowserKeyboardStateAdapter(props.inputAdapter);
    const onDown = (event: KeyboardEvent) => {
      if (!propsRef.current.inputAdapter.mapKey(event.key)) return;
      const nowMs = performance.now();
      const result = keyboardStateAdapter.apply(
        inputStateRef.current,
        { type: "keydown", key: event.key, repeat: event.repeat },
        nowMs,
      );
      event.preventDefault();
      if (result.inputState === inputStateRef.current && !result.immediateInput) return;
      inputStateRef.current = result.inputState;
      if (result.immediateInput) propsRef.current.onInput(result.immediateInput, nowMs, true, initialActionFromInputState(inputStateRef.current));
    };
    const onUp = (event: KeyboardEvent) => {
      if (!propsRef.current.inputAdapter.mapKey(event.key)) return;
      const result = keyboardStateAdapter.apply(inputStateRef.current, { type: "keyup", key: event.key }, performance.now());
      event.preventDefault();
      if (result.inputState === inputStateRef.current) return;
      inputStateRef.current = result.inputState;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    let frameId = 0;
    let lastTime = performance.now();
    const repeater = new MovementRepeater();
    const frame = (time: number) => {
      const deltaMs = Math.min(100, time - lastTime);
      lastTime = time;
      const repeat = repeater.next(inputStateRef.current, time, propsRef.current.settings);
      inputStateRef.current = repeat.inputState;
      for (const direction of repeat.moves) {
        propsRef.current.onInput(direction === "left" ? "moveLeft" : "moveRight", time, false, initialActionFromInputState(inputStateRef.current));
      }
      propsRef.current.onTickCombat(deltaMs, inputStateRef.current.softDropPressed, time, initialActionFromInputState(inputStateRef.current));
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      inputStateRef.current = createInputState();
    };
  }, [props.state.scene, props.inputAdapter]);

  if (props.state.scene === "mainMenu") {
    return (
      <MainMenuScreen
        canContinue={props.state.canContinue ?? false}
        onStartRun={props.onStartRun}
        onContinueRun={props.onContinueRun}
      />
    );
  }

  if (props.state.scene === "combat") {
    return (
      <CombatScreen
        state={props.state}
        onInput={props.onInput}
        onDebugLineClear={props.onDebugLineClear}
        onReturnToMenu={props.onReturnToMenu}
        devMode={props.devMode}
        settings={props.settings}
        onSettingsChange={props.onSettingsChange}
      />
    );
  }

  if (props.state.scene === "reward" && props.state.reward) {
    return <RewardScreen reward={props.state.reward} relics={relicDefinitions} onSelect={props.onSelectReward} />;
  }

  if (props.state.scene === "runResult") {
    return <RunResultScreen state={props.state} onStartRun={props.onStartRun} onReturnToMenu={props.onReturnToMenu} />;
  }

  return (
    <main className="app-shell map-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Run Map</p>
          <h1>TetroLogue</h1>
          <p>Pick a connected node, win the battle, then claim a relic.</p>
        </div>
        <button onClick={props.onReturnToMenu}>Menu</button>
      </header>
      <section className="map-layout">
        <NodeMapView run={props.state.run} onMoveToNode={props.onMoveToNode} />
        <RelicPanel inventory={props.state.run?.relicInventory} />
      </section>
    </main>
  );
}
