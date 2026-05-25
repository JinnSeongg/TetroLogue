import type { GameAppState } from "../application/GameAppState";
import type { SaveRunRepository } from "../application/ports/SaveRunRepository";
import { enemyDefinitions } from "../data/enemyDefinitions";
import { relicDefinitions } from "../data/relicDefinitions";
import { Board } from "../domain/tetris/Board";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import { HoldSlot } from "../domain/tetris/HoldSlot";
import type { Cell, TetrominoType } from "../domain/tetris/Cell";
import { RelicInventory } from "../domain/relic/RelicInventory";
import type { RelicInstance } from "../domain/relic/RelicInstance";
import type { GameEvent } from "../domain/shared/GameEvent";
import type { RewardDefinition } from "../domain/reward/RewardDefinition";
import type { NodeMap } from "../domain/run/NodeMap";
import type { RunProgressState } from "../domain/run/RunProgressState";
import { createRunProgressState, generateRunNodes } from "../domain/run/RunProgression";
import { createNodeMapFromFloorNodes, floorNodeId } from "../domain/run/RunGenerator";
import { normalizeRotationState, type RotationState } from "../domain/tetris/rotation/RotationState";
import { garbageConfig } from "../domain/combat/GarbageConfig";
import { GarbageQueue, type GarbagePacket } from "../domain/combat/GarbageQueue";
import type { ClearResult } from "../domain/tetris/ClearResult";
import type { ComboB2BResult } from "../domain/combat/ComboB2BTracker";
import type { CombatFeedbackEvent } from "../domain/combat/CombatFeedbackEvent";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type SavedGameStateV1 = {
  version: 1;
  scene: GameAppState["scene"];
  run?: {
    id: string;
    nodeMap: NodeMap;
    currentNodeId: string;
    progress?: RunProgressState;
    relics: RelicInstance[];
    status: "map" | "combat" | "event" | "shop" | "reward" | "complete";
  };
  combat?: {
    player: {
      hp: number;
      board: Cell[][];
      activePiece?: { type: TetrominoType; position: { x: number; y: number }; rotation: RotationState | number };
      pieceQueue?: TetrominoType[];
      nextPieces: TetrominoType[];
      hold?: TetrominoType;
      holdUsedThisTurn: boolean;
      combo: number;
      comboDisplayCount?: number;
      backToBackActive: boolean;
      backToBackCount?: number;
      actionCount: number;
      gravityElapsedMs: number;
      lockElapsedMs: number;
      softDropActive?: boolean;
      isGrounded?: boolean;
      groundedSinceMs?: number;
      lockResetCount?: number;
      lastLockResetAtMs?: number;
      lockResetLimitReachedLogged?: boolean;
    };
    enemy: {
      definitionId: string;
      hp: number;
      currentIntent?: {
        id: string;
        description: string;
        dueActionCount: number;
        garbageLines: number;
      };
      pendingGarbage: number;
      garbagePackets?: GarbagePacket[];
    };
    result: "ongoing" | "victory" | "defeat";
    lastAttack?: number;
    lastBaseAttack?: number;
    lastLinesCleared?: number;
    lastClearResult?: ClearResult;
    lastComboB2BResult?: ComboB2BResult;
    lastFeedbackEvent?: CombatFeedbackEvent;
    log: GameEvent[];
  };
  reward?: {
    choices: RewardDefinition[];
  };
  events: GameEvent[];
};

export class LocalStorageSaveRepository implements SaveRunRepository {
  constructor(
    private readonly key = "tetrologue.save",
    private readonly storage: StorageLike = localStorage,
  ) {}

  save(state: GameAppState): void {
    const serializable: SavedGameStateV1 = {
      version: 1,
      scene: state.scene,
      run: state.run
        ? {
            id: state.run.id,
            nodeMap: state.run.nodeMap,
            currentNodeId: state.run.currentNodeId,
            progress: state.run.progress,
            relics: state.run.relicInventory.relics,
            status: state.run.status,
          }
        : undefined,
      combat: state.combat
        ? {
            player: {
              hp: state.combat.player.hp,
              board: state.combat.player.board.snapshot(),
              activePiece: state.combat.player.activePiece
                ? {
                    type: state.combat.player.activePiece.type,
                    position: state.combat.player.activePiece.position,
                    rotation: state.combat.player.activePiece.rotation,
                  }
                : undefined,
              pieceQueue: state.combat.player.pieceQueue,
              nextPieces: state.combat.player.nextPieces,
              hold: state.combat.player.holdSlot.held,
              holdUsedThisTurn: state.combat.player.holdSlot.usedThisTurn,
              combo: state.combat.player.combo,
              comboDisplayCount: state.combat.player.comboDisplayCount,
              backToBackActive: state.combat.player.backToBackActive,
              backToBackCount: state.combat.player.backToBackCount,
              actionCount: state.combat.player.actionCount,
              gravityElapsedMs: state.combat.player.gravityElapsedMs,
              lockElapsedMs: state.combat.player.lockElapsedMs,
              softDropActive: state.combat.player.softDropActive,
              isGrounded: state.combat.player.isGrounded,
              groundedSinceMs: state.combat.player.groundedSinceMs,
              lockResetCount: state.combat.player.lockResetCount,
              lastLockResetAtMs: state.combat.player.lastLockResetAtMs,
              lockResetLimitReachedLogged: state.combat.player.lockResetLimitReachedLogged,
            },
            enemy: {
              definitionId: state.combat.enemy.definition.id,
              hp: state.combat.enemy.hp,
              currentIntent: state.combat.enemy.currentIntent,
              pendingGarbage: state.combat.enemy.pendingGarbage,
              garbagePackets: state.combat.enemy.garbageQueue.getPackets(),
            },
            result: state.combat.result,
            lastAttack: state.combat.lastAttack,
            lastBaseAttack: state.combat.lastBaseAttack,
            lastLinesCleared: state.combat.lastLinesCleared,
            lastClearResult: state.combat.lastClearResult,
            lastComboB2BResult: state.combat.lastComboB2BResult,
            lastFeedbackEvent: state.combat.lastFeedbackEvent,
            log: state.combat.log.slice(-50),
          }
        : undefined,
      reward: state.reward,
      events: state.events.slice(-50),
    };
    this.storage.setItem(this.key, JSON.stringify(serializable));
  }

  load(): GameAppState | undefined {
    const raw = this.storage.getItem(this.key);
    if (!raw) return undefined;
    const parsed = parseSavedState(raw);
    if (!parsed || parsed.version !== 1) return undefined;

    const progress = parsed.run?.progress ?? createRunProgressState(generateRunNodes());
    const run = parsed.run
      ? {
          id: parsed.run.id,
          nodeMap: parsed.run.progress ? parsed.run.nodeMap : createNodeMapFromFloorNodes(progress.nodes),
          currentNodeId: parsed.run.progress ? parsed.run.currentNodeId : floorNodeId(progress.currentFloor),
          progress,
          relicInventory: new RelicInventory(validateRelics(parsed.run.relics), relicDefinitions),
          status: parsed.run.status,
        }
      : undefined;

    const combatEnemyDefinition = parsed.combat ? enemyDefinitions[parsed.combat.enemy.definitionId] : undefined;
    if (parsed.combat && !combatEnemyDefinition) return undefined;

    const combat =
      parsed.combat && run && combatEnemyDefinition
        ? {
            player: {
              hp: parsed.combat.player.hp,
              board: new Board(parsed.combat.player.board[0]?.length ?? 10, parsed.combat.player.board.length, parsed.combat.player.board),
              activePiece: parsed.combat.player.activePiece
                ? new ActivePiece(
                    parsed.combat.player.activePiece.type,
                    parsed.combat.player.activePiece.position,
                    normalizeRotationState(parsed.combat.player.activePiece.rotation),
                  )
                : undefined,
              pieceQueue: parsed.combat.player.pieceQueue ?? parsed.combat.player.nextPieces,
              nextPieces: parsed.combat.player.nextPieces,
              hold: parsed.combat.player.hold,
              holdSlot: new HoldSlot(parsed.combat.player.hold, parsed.combat.player.holdUsedThisTurn),
              relicInventory: run.relicInventory,
              combo: parsed.combat.player.combo,
              comboDisplayCount: parsed.combat.player.comboDisplayCount ?? Math.max(0, parsed.combat.player.combo - 1),
              backToBackActive: parsed.combat.player.backToBackActive,
              backToBackCount: parsed.combat.player.backToBackCount ?? (parsed.combat.player.backToBackActive ? 1 : 0),
              actionCount: parsed.combat.player.actionCount,
              gravityElapsedMs: parsed.combat.player.gravityElapsedMs ?? 0,
              lockElapsedMs: parsed.combat.player.lockElapsedMs ?? 0,
              softDropActive: parsed.combat.player.softDropActive ?? false,
              isGrounded: parsed.combat.player.isGrounded ?? false,
              groundedSinceMs: parsed.combat.player.groundedSinceMs,
              lockResetCount: parsed.combat.player.lockResetCount ?? 0,
              lastLockResetAtMs: parsed.combat.player.lastLockResetAtMs,
              lockResetLimitReachedLogged: parsed.combat.player.lockResetLimitReachedLogged ?? false,
            },
            enemy: {
              definition: combatEnemyDefinition,
              hp: parsed.combat.enemy.hp,
              currentIntent: parsed.combat.enemy.currentIntent,
              pendingGarbage: parsed.combat.enemy.pendingGarbage ?? 0,
              garbageQueue: new GarbageQueue(
                { defaultDelay: garbageConfig.defaultIncomingGarbageDelay },
                parsed.combat.enemy.garbagePackets ??
                  (parsed.combat.enemy.pendingGarbage
                    ? [
                        {
                          id: "garbage_1",
                          amount: parsed.combat.enemy.pendingGarbage,
                          source: "loaded_pending",
                          remainingDelay: 0,
                        },
                      ]
                    : []),
              ),
            },
            result: parsed.combat.result,
            lastAttack: parsed.combat.lastAttack,
            lastBaseAttack: parsed.combat.lastBaseAttack,
            lastLinesCleared: parsed.combat.lastLinesCleared,
            lastClearResult: parsed.combat.lastClearResult,
            lastComboB2BResult: parsed.combat.lastComboB2BResult,
            lastFeedbackEvent: parsed.combat.lastFeedbackEvent,
            log: parsed.combat.log,
          }
        : undefined;

    return {
      scene: parsed.scene,
      run,
      combat,
      reward: parsed.reward,
      runResult: parsed.scene === "runResult" ? { result: "defeat", title: "Run Ended", message: "Loaded run has ended." } : undefined,
      events: parsed.events,
    };
  }
}

function parseSavedState(raw: string): SavedGameStateV1 | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSavedGameStateV1(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function validateRelics(relics: RelicInstance[]): RelicInstance[] {
  return relics.filter((relic) => relicDefinitions[relic.definitionId]);
}

function isSavedGameStateV1(value: unknown): value is SavedGameStateV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedGameStateV1>;
  return candidate.version === 1 && typeof candidate.scene === "string" && Array.isArray(candidate.events);
}
