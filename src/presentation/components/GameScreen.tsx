import { useEffect, useRef, useState } from "react";
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
import { RewardScreen } from "./RewardScreen";
import { RunResultScreen } from "./RunResultScreen";
import { SettingsPanel } from "./SettingsPanel";
import { RunProgressScreen } from "./RunProgressScreen";
import { ShopScreen } from "./ShopScreen";
import { AudioService, soundKeyForUiElement } from "../services/AudioService";

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
  onCompleteCurrentNode: () => void;
  onReturnToMenu: () => void;
  devMode: boolean;
  settings: PlayerSettings;
  onSettingsChange: (settings: PlayerSettings) => void;
};

export function GameScreen(props: Props) {
  const inputStateRef = useRef<InputState>(createInputState());
  const propsRef = useRef(props);
  const audioServiceRef = useRef(new AudioService());
  const lastAudioEventCountRef = useRef(props.state.events.length);
  const [settingsOpen, setSettingsOpen] = useState(false);
  propsRef.current = props;

  useEffect(() => {
    audioServiceRef.current.setVolumes({
      master: props.settings.audio.masterVolume / 100,
      sfx: props.settings.audio.sfxVolume / 100,
      ui: props.settings.audio.uiVolume / 100,
      music: props.settings.audio.musicVolume / 100,
    });
  }, [props.settings.audio]);

  useEffect(() => {
    const startIndex = Math.min(lastAudioEventCountRef.current, props.state.events.length);
    const newEvents = props.state.events.slice(startIndex);
    for (const event of newEvents) {
      audioServiceRef.current.playGameEvent(event);
      if (event.type === "CombatFeedback") audioServiceRef.current.playCombatFeedback(event.feedback);
    }
    lastAudioEventCountRef.current = props.state.events.length;
  }, [props.state.events]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const interactive = event.target.closest("button, .reward-card");
      if (interactive) audioServiceRef.current.play(soundKeyForUiElement(interactive));
    };
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    if (props.state.scene !== "combat") return;
    const keyboardStateAdapter = new BrowserKeyboardStateAdapter(props.inputAdapter, props.settings);
    const onDown = (event: KeyboardEvent) => {
      const mappedInput = propsRef.current.inputAdapter.mapKey(event.key, propsRef.current.settings);
      if (!mappedInput) return;
      const nowMs = performance.now();
      const wasSoftDropPressed = inputStateRef.current.softDropPressed;
      const result = keyboardStateAdapter.apply(
        inputStateRef.current,
        { type: "keydown", key: event.key, repeat: event.repeat },
        nowMs,
      );
      event.preventDefault();
      if (result.inputState === inputStateRef.current && !result.immediateInput) return;
      inputStateRef.current = result.inputState;
      if (mappedInput === "softDrop" && !event.repeat && !wasSoftDropPressed && inputStateRef.current.softDropPressed) {
        audioServiceRef.current.play("softDrop");
      }
      if (result.immediateInput) {
        audioServiceRef.current.playInput(result.immediateInput);
        propsRef.current.onInput(result.immediateInput, nowMs, true, initialActionFromInputState(inputStateRef.current));
      }
    };
    const onUp = (event: KeyboardEvent) => {
      if (!propsRef.current.inputAdapter.mapKey(event.key, propsRef.current.settings)) return;
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
        const input = direction === "left" ? "moveLeft" : "moveRight";
        audioServiceRef.current.playInput(input);
        propsRef.current.onInput(input, time, false, initialActionFromInputState(inputStateRef.current));
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
  }, [props.state.scene, props.inputAdapter, props.settings]);

  const settingsModal = settingsOpen ? (
    <SettingsPanel settings={props.settings} onChange={props.onSettingsChange} onClose={() => setSettingsOpen(false)} />
  ) : null;

  if (props.state.scene === "mainMenu") {
    return (
      <>
        <MainMenuScreen
          canContinue={props.state.canContinue ?? false}
          onStartRun={props.onStartRun}
          onContinueRun={props.onContinueRun}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {settingsModal}
      </>
    );
  }

  if (props.state.scene === "combat") {
    return (
      <CombatScreen
        state={props.state}
        onDebugLineClear={props.onDebugLineClear}
        onReturnToMenu={props.onReturnToMenu}
        devMode={props.devMode}
        settings={props.settings}
      />
    );
  }

  if (props.state.scene === "reward" && props.state.reward) {
    const isEvent = props.state.run?.status === "event";
    return (
      <RewardScreen
        reward={props.state.reward}
        relics={relicDefinitions}
        onSelect={props.onSelectReward}
        eyebrow={isEvent ? "Event" : "Battle Reward"}
        title={isEvent ? "Choose a Relic" : "Choose a Relic"}
      />
    );
  }

  if (props.state.scene === "shop") {
    return <ShopScreen reward={props.state.reward} relics={relicDefinitions} onSelect={props.onSelectReward} onLeave={props.onCompleteCurrentNode} />;
  }

  if (props.state.scene === "runResult") {
    return <RunResultScreen state={props.state} onStartRun={props.onStartRun} onReturnToMenu={props.onReturnToMenu} />;
  }

  return (
    <>
      <RunProgressScreen
        run={props.state.run}
        onEnterNode={props.onMoveToNode}
        onReturnToMenu={props.onReturnToMenu}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      {settingsModal}
    </>
  );
}
