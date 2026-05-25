import { describe, expect, it } from "vitest";
import type { CombatFeedbackEvent } from "../domain/combat/CombatFeedbackEvent";
import {
  AudioService,
  soundEventKeys,
  soundKeyForGameEvent,
  soundKeyForInput,
  soundKeysForCombatFeedback,
  type SoundDefinition,
  type SoundEventKey,
  type SoundPlayer,
} from "../presentation/services/AudioService";

class FakeSoundPlayer implements SoundPlayer {
  readonly played: Array<{ src: string; volume: number }> = [];

  play(src: string, volume: number): void {
    this.played.push({ src, volume });
  }
}

const soundMap = Object.fromEntries(
  soundEventKeys.map((key) => [key, { src: `${key}.ogg`, group: key === "danger" || key === "win" || key === "lose" ? "ui" : "sfx" }]),
) as Record<SoundEventKey, SoundDefinition>;

describe("AudioService", () => {
  it("defines every requested sound event key", () => {
    expect(soundEventKeys).toEqual([
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
    ]);
  });

  it("does not throw or play when a sound has no file source", () => {
    const player = new FakeSoundPlayer();
    const service = new AudioService({ ...soundMap, move: { group: "sfx" } }, player);

    service.play("move");

    expect(player.played).toEqual([]);
  });

  it("applies master and group volume when playing a sound", () => {
    const player = new FakeSoundPlayer();
    const service = new AudioService(soundMap, player);

    service.setVolumes({ master: 0.5, sfx: 0.4 });
    service.play("move");

    expect(player.played).toEqual([{ src: "move.ogg", volume: 0.2 }]);
  });

  it("maps operation inputs separately from feedback events", () => {
    expect(soundKeyForInput("moveLeft")).toBe("move");
    expect(soundKeyForInput("moveRight")).toBe("move");
    expect(soundKeyForInput("rotateClockwise")).toBe("rotate");
    expect(soundKeyForInput("rotateCounterClockwise")).toBe("rotate");
    expect(soundKeyForInput("rotate180")).toBe("rotate");
    expect(soundKeyForInput("hardDrop")).toBe("hardDrop");
    expect(soundKeyForInput("hold")).toBeUndefined();
  });

  it("maps game lifecycle events to safe UI or SFX sounds", () => {
    expect(soundKeyForGameEvent({ type: "PiecePlaced", pieceType: "T" })).toBe("lock");
    expect(soundKeyForGameEvent({ type: "GarbagePending", lines: 3, dueActionCount: 2 })).toBe("garbageIncoming");
    expect(soundKeyForGameEvent({ type: "GarbageApplied", lines: 2, holeX: 4 })).toBe("danger");
    expect(soundKeyForGameEvent({ type: "CombatEnded", result: "victory" })).toBe("win");
    expect(soundKeyForGameEvent({ type: "CombatEnded", result: "defeat" })).toBe("lose");
  });

  it("maps combat feedback to clear, attack, combo, B2B, perfect clear, and danger sounds", () => {
    const event = feedback({
      clearName: "Tetris",
      clearedLines: 4,
      attackAmount: 6,
      isComboActive: true,
      isBackToBack: true,
      isPerfectClear: true,
      dangerLevel: "Critical",
    });

    expect(soundKeysForCombatFeedback(event)).toEqual(["tetris", "combo", "backToBack", "perfectClear", "attack", "hit", "danger"]);
  });

  it("plays all combat feedback sounds through the configured player", () => {
    const player = new FakeSoundPlayer();
    const service = new AudioService(soundMap, player);

    service.playCombatFeedback(feedback({ clearName: "T-Spin Double", clearedLines: 2, attackAmount: 4 }));

    expect(player.played.map((sound) => sound.src)).toEqual(["tspin.ogg", "attack.ogg", "hit.ogg"]);
  });

  it("plays a combat feedback event only once by event id", () => {
    const player = new FakeSoundPlayer();
    const service = new AudioService(soundMap, player);
    const event = feedback({ eventId: "tspin-double-1", clearName: "T-Spin Double", clearedLines: 2, attackAmount: 4 });

    service.playCombatFeedback(event);
    service.playCombatFeedback(event);

    expect(player.played.map((sound) => sound.src)).toEqual(["tspin.ogg", "attack.ogg", "hit.ogg"]);
  });

  it("plays a Tetris combat feedback event only once by event id", () => {
    const player = new FakeSoundPlayer();
    const service = new AudioService(soundMap, player);
    const event = feedback({ eventId: "tetris-1", clearName: "Tetris", clearedLines: 4, attackAmount: 4 });

    service.playCombatFeedback(event);
    service.playCombatFeedback(event);

    expect(player.played.map((sound) => sound.src)).toEqual(["tetris.ogg", "attack.ogg", "hit.ogg"]);
  });

  it("does not play tspin for a no-line lock even if clearName is stale", () => {
    expect(soundKeysForCombatFeedback(feedback({ clearName: "T-Spin Double", clearedLines: 0 }))).toEqual([]);
  });

  it("does not play tetris for a no-line lock even if clearName is stale", () => {
    expect(soundKeysForCombatFeedback(feedback({ clearName: "Tetris", clearedLines: 0 }))).toEqual([]);
  });

  it("can play soft drop as a direct operation sound event", () => {
    const player = new FakeSoundPlayer();
    const service = new AudioService(soundMap, player);

    service.play("softDrop");

    expect(player.played.map((sound) => sound.src)).toEqual(["softDrop.ogg"]);
  });

  it("debounces rapid repeated sounds by event key", () => {
    const player = new FakeSoundPlayer();
    const service = new AudioService({ ...soundMap, move: { src: "move.ogg", group: "sfx", minIntervalMs: 50 } }, player);

    service.play("move", 100);
    service.play("move", 120);
    service.play("move", 151);

    expect(player.played.map((sound) => sound.src)).toEqual(["move.ogg", "move.ogg"]);
  });
});

function feedback(overrides: Partial<CombatFeedbackEvent> = {}): CombatFeedbackEvent {
  return {
    eventId: "combat-feedback-test",
    sequenceId: 1,
    createdAtMs: 0,
    clearName: "None",
    clearedLines: 0,
    attackAmount: 0,
    offsetAmount: 0,
    comboCount: 0,
    isComboActive: false,
    isBackToBack: false,
    backToBackCount: 0,
    isPerfectClear: false,
    dangerLevel: "Safe",
    intensity: "none",
    ...overrides,
  };
}
