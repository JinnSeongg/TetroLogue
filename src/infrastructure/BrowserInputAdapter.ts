import type { PlayerInput } from "../application/GameAppState";
import { defaultPlayerSettings, type PlayerSettings } from "../application/settings/PlayerSettings";

export type BrowserControlInput = PlayerInput | "softDrop";

export class BrowserInputAdapter {
  mapKey(key: string, settings: PlayerSettings = defaultPlayerSettings): BrowserControlInput | undefined {
    const normalized = normalizeKey(key);
    const bindings = settings.input.keyBindings;
    for (const action of Object.keys(bindings) as BrowserControlInput[]) {
      if (bindings[action].some((boundKey) => normalizeKey(boundKey) === normalized)) return action;
    }
    return undefined;
  }
}

export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}
