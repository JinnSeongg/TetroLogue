import type { GameAppState } from "./GameAppState";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { Board } from "../domain/tetris/Board";
import { PieceQueue } from "../domain/tetris/PieceQueue";
import { HoldSlot } from "../domain/tetris/HoldSlot";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";
import { findNode } from "../domain/run/NodeMap";
import { enemyDefinitions } from "../data/enemyDefinitions";
import type { TetrominoType } from "../domain/tetris/Cell";
import { createEnteredSpawnPiece } from "../domain/tetris/SpawnRules";
import { createInputBuffer } from "./input/InputBuffer";
import { garbageConfig } from "../domain/combat/GarbageConfig";
import { GarbageQueue } from "../domain/combat/GarbageQueue";
import { calculateEnemyStats } from "../domain/balance/enemyStatCalculator";
import type { EnemyRole } from "../domain/balance/balanceTypes";
import type { EnemyTraitId } from "../domain/enemy/EnemyTrait";
import { createScaledRuleSet } from "../domain/balance/ruleSetScaler";
import { createInitialCombatTelemetry } from "../domain/combat/BattleResultSummary";
import { EffectResolver } from "../domain/relic/EffectResolver";

export class StartCombatUseCase {
  constructor(private readonly random: RandomProvider) {}

  execute(state: GameAppState): GameAppState {
    if (!state.run) return state;
    const node = findNode(state.run.nodeMap, state.run.currentNodeId);
    const enemy = enemyDefinitions[node?.enemyId ?? "enemy_dummy"];
    const enemyRole: EnemyRole = node?.type === "boss" && state.run.progress.currentFloor === state.run.progress.maxFloor ? "finalBoss" : enemy.role;
    const enemyTraits: EnemyTraitId[] = enemyRole === "finalBoss" && !enemy.traits.includes("final_boss") ? [...enemy.traits, "final_boss"] : enemy.traits;
    const calculatedStats = calculateEnemyStats({
      floor: state.run.progress.currentFloor,
      difficultyId: state.run.difficultyId ?? "standard",
      enemyRole,
      traits: enemyTraits,
    });
    const scaledRuleSet = createScaledRuleSet(standardRuleSet, calculatedStats);
    const ruleSetResult = new EffectResolver().resolveEffectiveRuleSet(scaledRuleSet, state.run.relicInventory.getDefinitions(), {
      includeDetails: true,
    });
    const currentCombatRuleSet = ruleSetResult.ruleSet;
    const queue = new PieceQueue(this.random);
    const holdSlot = new HoldSlot(undefined, false, currentCombatRuleSet.maxHoldSlots);
    const firstPiece: TetrominoType = queue.popNext();
    const board = Board.create(currentCombatRuleSet.boardWidth, currentCombatRuleSet.boardHeight);
    const activePiece = createEnteredSpawnPiece(firstPiece, board, currentCombatRuleSet);
    queue.ensureQueueSize(currentCombatRuleSet.nextPreviewCount + 1);
    return {
      ...state,
      scene: "combat",
      reward: undefined,
      runResult: undefined,
      inputBuffer: createInputBuffer(),
      combat: {
        player: {
          hp: 1,
          board,
          activePiece,
          pieceQueue: queue.snapshot(),
          nextPieces: queue.peekNext(currentCombatRuleSet.nextPreviewCount),
          holdSlot,
          holdSlots: holdSlot.holdSlots,
          maxHoldSlots: holdSlot.maxHoldSlots,
          hasHeldThisPiece: holdSlot.hasHeldThisPiece,
          holdUsedThisBattle: false,
          relicInventory: state.run.relicInventory,
          combo: 0,
          comboDisplayCount: 0,
          backToBackActive: false,
          backToBackCount: 0,
          fastChainCount: 0,
          isFastState: false,
          lastPieceLockTimeMs: undefined,
          actionCount: 0,
          gravityElapsedMs: 0,
          lockElapsedMs: 0,
          softDropActive: false,
          isGrounded: false,
          groundedSinceMs: undefined,
          lockResetCount: 0,
          lastLockResetAtMs: undefined,
          lockResetLimitReachedLogged: false,
          lastSpinAction: undefined,
        },
        enemy: {
          definition: enemy,
          hp: calculatedStats.maxHp,
          maxHp: calculatedStats.maxHp,
          calculatedStats,
          pendingGarbage: 0,
          garbageQueue: new GarbageQueue({ defaultDelay: calculatedStats.garbageDelayActions ?? garbageConfig.defaultIncomingGarbageDelay }),
        },
        ruleSet: currentCombatRuleSet,
        ruleSetModifierDebug: {
          baseRuleSet: ruleSetResult.baseRuleSet,
          effectiveRuleSet: currentCombatRuleSet,
          appliedRuleRelicIds: ruleSetResult.appliedRuleRelicIds,
        },
        telemetry: createInitialCombatTelemetry(0),
        result: "ongoing",
        log: [{ type: "CombatStarted", enemyId: enemy.id }, { type: "PieceSpawned", pieceType: firstPiece }],
      },
      events: [...state.events, { type: "CombatStarted", enemyId: enemy.id }, { type: "PieceSpawned", pieceType: firstPiece }],
    };
  }
}
