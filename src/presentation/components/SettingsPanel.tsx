import type { PlayerSettings } from "../../application/settings/PlayerSettings";

type Props = {
  settings: PlayerSettings;
  onChange: (settings: PlayerSettings) => void;
};

export function SettingsPanel({ settings, onChange }: Props) {
  const updateInput = (field: "dasMs" | "arrMs", value: number) => {
    onChange({
      ...settings,
      input: {
        ...settings.input,
        [field]: value,
      },
    });
  };

  return (
    <section className="panel">
      <h2>Settings</h2>
      <label className="setting-row">
        <span>DAS</span>
        <input
          type="range"
          min="60"
          max="400"
          step="5"
          value={settings.input.dasMs}
          onChange={(event) => updateInput("dasMs", Number(event.target.value))}
        />
        <strong>{settings.input.dasMs}ms</strong>
      </label>
      <label className="setting-row">
        <span>ARR</span>
        <input
          type="range"
          min="0"
          max="120"
          step="5"
          value={settings.input.arrMs}
          onChange={(event) => updateInput("arrMs", Number(event.target.value))}
        />
        <strong>{settings.input.arrMs}ms</strong>
      </label>
    </section>
  );
}
