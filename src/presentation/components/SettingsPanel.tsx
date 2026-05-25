import { useEffect, useState } from "react";
import {
  controlActions,
  defaultPlayerSettings,
  type ControlAction,
  type PlayerSettings,
} from "../../application/settings/PlayerSettings";
import { normalizeKey } from "../../infrastructure/BrowserInputAdapter";

type Props = {
  settings: PlayerSettings;
  onChange: (settings: PlayerSettings) => void;
  onClose: () => void;
};

type SettingsTab = "Gameplay" | "Controls" | "Audio";

const actionLabels: Record<ControlAction, string> = {
  moveLeft: "Move Left",
  moveRight: "Move Right",
  softDrop: "Soft Drop",
  hardDrop: "Hard Drop",
  rotateClockwise: "Rotate CW",
  rotateCounterClockwise: "Rotate CCW",
  rotate180: "Rotate 180",
  hold: "Hold",
};

export function SettingsPanel({ settings, onChange, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("Gameplay");
  const [rebindingAction, setRebindingAction] = useState<ControlAction | null>(null);
  const [bindingError, setBindingError] = useState<string | null>(null);

  useEffect(() => {
    if (!rebindingAction) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      if (event.key === "Escape") {
        setRebindingAction(null);
        setBindingError(null);
        return;
      }
      rebindAction(rebindingAction, event.key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rebindingAction, settings]);

  const updateInput = (field: "dasMs" | "arrMs" | "softDropGravityMs", value: number) => {
    onChange({ ...settings, input: { ...settings.input, [field]: value } });
  };

  const updateVideo = (field: keyof PlayerSettings["video"], value: boolean) => {
    onChange({ ...settings, video: { ...settings.video, [field]: value } });
  };

  const updateAudio = (field: keyof PlayerSettings["audio"], value: number) => {
    onChange({ ...settings, audio: { ...settings.audio, [field]: value } });
  };

  const rebindAction = (action: ControlAction, key: string) => {
    const normalized = normalizeKey(key);
    const duplicate = controlActions.find((candidate) =>
      candidate !== action && settings.input.keyBindings[candidate].some((boundKey) => normalizeKey(boundKey) === normalized),
    );
    if (duplicate) {
      setBindingError(`${formatKey(key)} is already assigned to ${actionLabels[duplicate]}.`);
      return;
    }

    onChange({
      ...settings,
      input: {
        ...settings.input,
        keyBindings: {
          ...settings.input.keyBindings,
          [action]: [key],
        },
      },
    });
    setRebindingAction(null);
    setBindingError(null);
  };

  const restoreDefaultControls = () => {
    onChange({
      ...settings,
      input: {
        ...settings.input,
        keyBindings: defaultPlayerSettings.input.keyBindings,
      },
    });
    setRebindingAction(null);
    setBindingError(null);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
        <header className="settings-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h1>Player Setup</h1>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="settings-tabs">
          {(["Gameplay", "Controls", "Audio"] as SettingsTab[]).map((tab) => (
            <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
        {activeTab === "Gameplay" ? (
          <div className="settings-content">
            <NumberSetting label="DAS" min={60} max={400} step={5} value={settings.input.dasMs} suffix="ms" onChange={(value) => updateInput("dasMs", value)} />
            <NumberSetting label="ARR" min={0} max={120} step={5} value={settings.input.arrMs} suffix="ms" onChange={(value) => updateInput("arrMs", value)} />
            <NumberSetting
              label="Soft Drop Speed"
              min={1}
              max={120}
              step={1}
              value={settings.input.softDropGravityMs}
              suffix="ms"
              onChange={(value) => updateInput("softDropGravityMs", value)}
            />
            <ToggleSetting label="Screen Shake" checked={settings.video.screenShakeEnabled} onChange={(value) => updateVideo("screenShakeEnabled", value)} />
            <ToggleSetting label="Ghost Piece" checked={settings.video.ghostPieceEnabled} onChange={(value) => updateVideo("ghostPieceEnabled", value)} />
            <ToggleSetting label="Grid Visibility" checked={settings.video.gridVisible} onChange={(value) => updateVideo("gridVisible", value)} />
          </div>
        ) : null}
        {activeTab === "Controls" ? (
          <div className="settings-content">
            <div className="control-bindings">
              {controlActions.map((action) => (
                <div key={action} className="control-binding-row">
                  <span>{actionLabels[action]}</span>
                  <button className={rebindingAction === action ? "binding-active" : ""} onClick={() => setRebindingAction(action)}>
                    {rebindingAction === action ? "Press key" : settings.input.keyBindings[action].map(formatKey).join(" / ")}
                  </button>
                </div>
              ))}
            </div>
            {bindingError ? <p className="settings-error">{bindingError}</p> : null}
            <button onClick={restoreDefaultControls}>Restore Defaults</button>
          </div>
        ) : null}
        {activeTab === "Audio" ? (
          <div className="settings-content">
            <NumberSetting label="Master Volume" min={0} max={100} step={1} value={settings.audio.masterVolume} suffix="%" onChange={(value) => updateAudio("masterVolume", value)} />
            <NumberSetting label="SFX Volume" min={0} max={100} step={1} value={settings.audio.sfxVolume} suffix="%" onChange={(value) => updateAudio("sfxVolume", value)} />
            <NumberSetting label="UI Volume" min={0} max={100} step={1} value={settings.audio.uiVolume} suffix="%" onChange={(value) => updateAudio("uiVolume", value)} />
            <NumberSetting label="Music Volume" min={0} max={100} step={1} value={settings.audio.musicVolume} suffix="%" onChange={(value) => updateAudio("musicVolume", value)} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function NumberSetting(props: { label: string; min: number; max: number; step: number; value: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label className="setting-row">
      <span>{props.label}</span>
      <input type="range" min={props.min} max={props.max} step={props.step} value={props.value} onChange={(event) => props.onChange(Number(event.target.value))} />
      <strong>
        {props.value}
        {props.suffix}
      </strong>
    </label>
  );
}

function ToggleSetting(props: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>{props.label}</span>
      <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} />
    </label>
  );
}

function formatKey(key: string): string {
  if (key === " ") return "Space";
  return key;
}
