import type { PlayerInput } from "../../application/GameAppState";
import type { CombatFeedbackEvent } from "../../domain/combat/CombatFeedbackEvent";
import type { GameEvent } from "../../domain/shared/GameEvent";
import { audioRegistry } from "./AudioRegistry";

export type SoundEventKey =
  | "move"
  | "rotate"
  | "softDrop"
  | "hardDrop"
  | "lock"
  | "clear"
  | "single"
  | "double"
  | "triple"
  | "tetris"
  | "tspin"
  | "combo"
  | "backToBack"
  | "perfectClear"
  | "attack"
  | "hit"
  | "danger"
  | "garbageIncoming"
  | "menuHover"
  | "menuClick"
  | "confirm"
  | "cancel"
  | "win"
  | "lose";

export const soundEventKeys = [
  "move",
  "rotate",
  "softDrop",
  "hardDrop",
  "lock",
  "clear",
  "single",
  "double",
  "triple",
  "tetris",
  "tspin",
  "combo",
  "backToBack",
  "perfectClear",
  "attack",
  "hit",
  "danger",
  "garbageIncoming",
  "menuHover",
  "menuClick",
  "confirm",
  "cancel",
  "win",
  "lose",
] as const satisfies readonly SoundEventKey[];

export type VolumeGroup = "master" | "sfx" | "ui" | "music";

export type AudioVolumes = Record<VolumeGroup, number>;

export type SoundDefinition = {
  src?: string;
  group: VolumeGroup;
  fallback?: SoundEventKey;
  minIntervalMs?: number;
  maxConcurrent?: number;
};

export type SoundPlayer = {
  play(src: string, volume: number): void | Promise<void>;
};

export class AudioService {
  private volumes: AudioVolumes = { master: 1, sfx: 1, ui: 1, music: 1 };
  private readonly lastPlayedAt = new Map<SoundEventKey, number>();
  private readonly activeCounts = new Map<SoundEventKey, number>();
  private readonly processedCombatFeedbackEventIds = new Set<string>();

  constructor(
    private readonly sounds: Record<SoundEventKey, SoundDefinition> = audioRegistry,
    private readonly player: SoundPlayer = new BrowserSoundPlayer(),
  ) {}

  setVolumes(volumes: Partial<AudioVolumes>): void {
    this.volumes = { ...this.volumes, ...volumes };
  }

  play(key: SoundEventKey, nowMs = performanceNow()): void {
    const sound = this.sounds[key];
    if (!sound?.src) {
      if (sound?.fallback && sound.fallback !== key) this.play(sound.fallback, nowMs);
      return;
    }
    if (!this.canPlay(key, sound, nowMs)) return;
    const volume = this.effectiveVolume(sound.group);
    if (volume <= 0) return;
    try {
      this.markStarted(key, sound, nowMs);
      const played = this.player.play(sound.src, volume);
      if (played && typeof played.then === "function") {
        void played.catch(() => undefined).finally(() => this.markFinished(key));
      }
    } catch {
      this.markFinished(key);
      // Missing/blocked audio must never break gameplay or UI.
    }
  }

  playInput(input: PlayerInput): void {
    const key = soundKeyForInput(input);
    if (key) this.play(key);
  }

  playGameEvent(event: GameEvent): void {
    const key = soundKeyForGameEvent(event);
    if (key) this.play(key);
  }

  playCombatFeedback(event?: CombatFeedbackEvent): void {
    if (!event || this.processedCombatFeedbackEventIds.has(event.eventId)) return;
    this.processedCombatFeedbackEventIds.add(event.eventId);
    for (const key of soundKeysForCombatFeedback(event)) this.play(key);
  }

  effectiveVolume(group: VolumeGroup): number {
    return clamp01(this.volumes.master) * clamp01(this.volumes[group]);
  }

  private canPlay(key: SoundEventKey, sound: SoundDefinition, nowMs: number): boolean {
    const minIntervalMs = sound.minIntervalMs ?? 0;
    const lastPlayedAt = this.lastPlayedAt.get(key);
    if (lastPlayedAt !== undefined && nowMs - lastPlayedAt < minIntervalMs) return false;

    const maxConcurrent = sound.maxConcurrent ?? 4;
    return (this.activeCounts.get(key) ?? 0) < maxConcurrent;
  }

  private markStarted(key: SoundEventKey, sound: SoundDefinition, nowMs: number): void {
    this.lastPlayedAt.set(key, nowMs);
    this.activeCounts.set(key, (this.activeCounts.get(key) ?? 0) + 1);
    const releaseMs = Math.max(sound.minIntervalMs ?? 0, 300);
    if (typeof window !== "undefined") window.setTimeout(() => this.markFinished(key), releaseMs);
  }

  private markFinished(key: SoundEventKey): void {
    const nextCount = Math.max(0, (this.activeCounts.get(key) ?? 0) - 1);
    if (nextCount === 0) this.activeCounts.delete(key);
    else this.activeCounts.set(key, nextCount);
  }
}

export function soundKeyForInput(input: PlayerInput): SoundEventKey | undefined {
  if (input === "moveLeft" || input === "moveRight") return "move";
  if (input === "rotateClockwise" || input === "rotateCounterClockwise" || input === "rotate180") return "rotate";
  if (input === "hardDrop") return "hardDrop";
  return undefined;
}

export function soundKeyForGameEvent(event: GameEvent): SoundEventKey | undefined {
  if (event.type === "PlayerActionSucceeded") return event.action;
  if (event.type === "PiecePlaced") return "lock";
  if (event.type === "CombatEnded") return event.result === "victory" ? "win" : "lose";
  if (event.type === "GarbagePending") return "garbageIncoming";
  if (event.type === "GarbageApplied") return "danger";
  return undefined;
}

export function soundKeysForCombatFeedback(event?: CombatFeedbackEvent): SoundEventKey[] {
  if (!event) return [];
  const keys: SoundEventKey[] = [];
  if (event.clearedLines > 0) keys.push(soundKeyForClearName(event.clearName));
  if (event.isComboActive) keys.push("combo");
  if (event.isBackToBack) keys.push("backToBack");
  if (event.isPerfectClear) keys.push("perfectClear");
  if (event.attackAmount > 0) keys.push("attack", "hit");
  if (event.dangerLevel === "Danger" || event.dangerLevel === "Critical") keys.push("danger");
  return [...new Set(keys)];
}

export function soundKeyForClearName(clearName: string): SoundEventKey {
  if (clearName === "Perfect Clear") return "perfectClear";
  if (clearName.includes("T-Spin")) return "tspin";
  if (clearName === "Tetris") return "tetris";
  if (clearName === "Triple") return "triple";
  if (clearName === "Double") return "double";
  if (clearName === "Single") return "single";
  return "clear";
}

export function soundKeyForUiElement(element: Element): SoundEventKey {
  const text = element.textContent?.trim().toLowerCase() ?? "";
  if (element.closest(".reward-card") || element.classList.contains("primary-button")) return "confirm";
  if (text === "close" || text === "menu" || text === "cancel") return "cancel";
  return "menuClick";
}

class BrowserSoundPlayer implements SoundPlayer {
  play(src: string, volume: number): void {
    if (typeof Audio === "undefined") return;
    const audio = new Audio(src);
    audio.volume = clamp01(volume);
    void audio.play().catch(() => undefined);
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function performanceNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
