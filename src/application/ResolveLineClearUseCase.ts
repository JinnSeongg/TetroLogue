import type { GameAppState } from "./GameAppState";
import { AttackCalculator } from "../domain/combat/AttackCalculator";
import { DamageResolver } from "../domain/combat/DamageResolver";
import { RewardGenerator } from "../domain/reward/RewardGenerator";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { relicRewardTable } from "../data/rewardTables";
import { EnemyPatternSystem } from "../domain/enemy/EnemyPatternSystem";
import type { GameEvent } from "../domain/shared/GameEvent";
import { getCurrentNode } from "../domain/run/RunProgression";
import { noSpinResult, type SpinResult } from "../domain/tetris/SpinDetector";
import { GarbageQueue } from "../domain/combat/GarbageQueue";
import { garbageConfig } from "../domain/combat/GarbageConfig";
import { GarbageApplier } from "../domain/combat/GarbageApplier";
import { createClearResult, type ClearResult } from "../domain/tetris/ClearResult";
import { ComboB2BTracker, type ComboB2BTrackerConfig } from "../domain/combat/ComboB2BTracker";
import { FieldAnalyzer } from "../domain/combat/field-analysis/FieldAnalyzer";
import { CombatFeedbackEventFactory } from "../domain/combat/CombatFeedbackEventFactory";
import type { BattleResultSummary, CombatTelemetry } from "../domain/combat/BattleResultSummary";
import { createInitialCombatTelemetry } from "../domain/combat/BattleResultSummary";
import type { CombatState } from "../domain/combat/CombatState";
import { triggerCombatGameOver } from "./CombatGameOver";
import { EffectResolver } from "../domain/relic/EffectResolver";

export class ResolveLineClearUseCase {
  constructor(
    private readonly random: RandomProvider,
    private readonly comboB2BConfig?: ComboB2BTrackerConfig,
  ) {}

  execute(
    state: GameAppState,
    linesCleared: number,
    spinResult: SpinResult = noSpinResult(),
    isPerfectClear = false,
    clearResult: ClearResult = createClearResult({ linesCleared, spinResult, isPerfectClear }),
  ): GameAppState {
    if (!state.combat || !state.run || state.combat.result !== "ongoing") return state;
    if (!state.combat.player.activePiece) {
      return triggerCombatGameOver(state, "missingActivePiece", ["activePiece missing during active combat"]);
    }
    const baseAttack = new AttackCalculator().calculate({
      lineClearCount: linesCleared,
      spinResult,
      isPerfectClear,
      comboBefore: Math.max(0, state.combat.player.combo),
      wasB2BActive: state.combat.player.backToBackActive,
    });
    const attackFieldState = new FieldAnalyzer().analyze(state.combat.player.board);
    const garbageQueue = new GarbageQueue(
      { defaultDelay: state.combat.enemy.calculatedStats?.garbageDelayActions ?? garbageConfig.defaultIncomingGarbageDelay },
      state.combat.enemy.garbageQueue?.getPackets() ??
        (state.combat.enemy.pendingGarbage
          ? [{ id: "garbage_1", amount: state.combat.enemy.pendingGarbage, source: "legacy_pending", remainingDelay: 0 }]
          : []),
    );
    const relicAttack = new EffectResolver().applyAttackModifiers(
      baseAttack.totalDamage,
      state.run.relicInventory.getDefinitions(),
      {
        linesCleared,
        backToBackActive: state.combat.player.backToBackActive,
        isDanger: attackFieldState.dangerLevel === "Danger" || attackFieldState.dangerLevel === "Critical",
        fieldHeight: attackFieldState.maxHeight,
        holdUsedThisBattle: state.combat.player.holdUsedThisBattle,
        pendingGarbageLines: garbageQueue.getTotalAmount(),
        isFast: state.combat.player.isFastState,
        fastChain: state.combat.player.fastChainCount,
        holeCount: attackFieldState.holeCount,
        isTSpin: clearResult.isTSpin,
        isTSpinMini: clearResult.isTSpinMini,
        isTSpinFull: clearResult.isTSpin && !clearResult.isTSpinMini,
        combo: baseAttack.comboAfter,
        comboBonus: baseAttack.comboBonus,
        attackKind: baseAttack.attackType,
      },
      { includeDetails: true },
    );
    const attack = {
      ...baseAttack,
      totalDamage: relicAttack.attack,
      preRelicTotalDamage: relicAttack.preRelicAttack,
      relicAttackBonus: relicAttack.relicAttackBonus,
      appliedRelicIds: relicAttack.appliedRelicIds,
    };
    const cancelResult = garbageQueue.cancelWithAttack(attack.totalDamage);
    // Damage order: player attack cancels pending garbage first, then remaining attack is reduced by enemy defense.
    const damage = new DamageResolver().resolve(state.combat.enemy.definition, cancelResult.remainingAttackDamage, linesCleared);
    const comboB2BResult = new ComboB2BTracker({
      comboCount: state.combat.player.combo,
      comboDisplayCount: state.combat.player.comboDisplayCount,
      isComboActive: state.combat.player.combo > 1,
      isBackToBack: state.combat.player.backToBackActive,
      backToBackCount: state.combat.player.backToBackCount,
    }, this.comboB2BConfig).next(clearResult);
    const nextActionCount = state.combat.player.actionCount + 1;
    garbageQueue.tickDelay();
    const readyPackets = garbageQueue.popReadyPackets();
    const garbageResult = new GarbageApplier().apply(state.combat.player.board, readyPackets, this.random);
    const boardAfterGarbage = garbageResult.appliedLines > 0 ? garbageResult.board : state.combat.player.board;
    const garbageDefeat = garbageResult.appliedLines > 0 && garbageResult.overflow;
    const dangerState = new FieldAnalyzer().analyze(boardAfterGarbage);
    const feedbackEvent = new CombatFeedbackEventFactory().create({
      clearResult,
      attackResult: attack,
      comboB2BResult,
      dangerState,
      offsetAmount: cancelResult.cancelledGarbage,
    });
    const nextEnemyHp = Math.max(0, state.combat.enemy.hp - damage);
    const damageDealtToEnemy = Math.min(state.combat.enemy.hp, damage);
    const result = nextEnemyHp <= 0 ? "victory" : "ongoing";
    const currentNode = getCurrentNode(state.run.progress);
    const runWon = result === "victory" && currentNode?.type === "finalBoss";
    const canCreateIntent = result === "ongoing" && !garbageDefeat;
    const generatedIntent = canCreateIntent
      ? new EnemyPatternSystem().nextIntent(state.combat.enemy.definition, nextActionCount, state.combat.enemy.calculatedStats)
      : undefined;
    if (generatedIntent?.garbageLines) {
      garbageQueue.enqueue(generatedIntent.garbageLines, generatedIntent.id);
    }
    const nextTelemetry = updateCombatTelemetry({
      combat: state.combat,
      playerAttackGenerated: attack.totalDamage,
      attackBlockedByPendingGarbage: cancelResult.cancelledGarbage,
      damageDealtToEnemy,
      garbageQueued: generatedIntent?.garbageLines ?? 0,
      garbageCancelled: cancelResult.cancelledGarbage,
      garbageApplied: garbageResult.appliedLines,
      linesCleared,
      boardHeight: dangerState.maxHeight,
    });
    const nextIntent = generatedIntent ?? state.combat.enemy.currentIntent;
    const nextPendingGarbage = garbageQueue.getTotalAmount();
    const finalResult = garbageDefeat ? "defeat" : result;
    const battleResultSummary =
      finalResult === "ongoing"
        ? state.combat.lastBattleResultSummary
        : createBattleResultSummary({
            state,
            telemetry: nextTelemetry,
            finalBoardHeight: dangerState.maxHeight,
            result: finalResult === "victory" ? "win" : "loss",
          });
    const reward =
      finalResult === "victory" && !runWon
        ? { choices: new RewardGenerator(relicRewardTable, this.random).generate(3, state.run.relicInventory) }
        : state.reward;
    const combatEvents: GameEvent[] = [
      { type: "SpinDetected" as const, spinResult },
      ...(linesCleared > 0 ? [{ type: "LineCleared" as const, lines: linesCleared, spinResult, clearResult }] : []),
      ...(linesCleared === 4 ? [{ type: "TetrisCleared" as const }] : []),
      ...(isPerfectClear ? [{ type: "PerfectClearAchieved" as const }] : []),
      ...(comboB2BResult.comboCount !== state.combat.player.combo ? [{ type: "ComboChanged" as const, combo: comboB2BResult.comboCount }] : []),
      ...(comboB2BResult.isBackToBack !== state.combat.player.backToBackActive ? [{ type: "BackToBackChanged" as const, active: comboB2BResult.isBackToBack }] : []),
      {
        type: "AttackCalculated",
        baseAttack: attack.baseDamage,
        finalAttack: attack.totalDamage,
        baseDamage: attack.baseDamage,
        totalDamage: attack.totalDamage,
        preRelicTotalDamage: attack.preRelicTotalDamage,
        relicAttackBonus: attack.relicAttackBonus,
        appliedRelicIds: attack.appliedRelicIds,
        actionName: attack.actionName,
        lineClearCount: linesCleared,
        spinResult,
        clearResult,
        attackResult: attack,
      },
      ...(cancelResult.cancelledGarbage > 0
        ? [{ type: "GarbageCanceled" as const, canceledLines: cancelResult.cancelledGarbage, remainingPending: cancelResult.remainingGarbageAmount }]
        : []),
      { type: "EnemyDamaged", enemyId: state.combat.enemy.definition.id, damage, remainingHp: nextEnemyHp },
      ...readyPackets.map((packet, index) => ({
        type: "GarbageApplied" as const,
        lines: packet.amount,
        holeX: garbageResult.holes[index] ?? 0,
      })),
      { type: "CombatFeedback" as const, feedback: feedbackEvent },
      ...(generatedIntent
        ? [
            {
              type: "EnemyIntentChanged" as const,
              enemyId: state.combat.enemy.definition.id,
              intentId: generatedIntent.id,
              description: generatedIntent.description,
              garbageLines: generatedIntent.garbageLines,
            },
            { type: "GarbagePending" as const, lines: generatedIntent.garbageLines, dueActionCount: generatedIntent.dueActionCount },
          ]
        : []),
      ...(finalResult === "victory" ? [{ type: "CombatEnded" as const, result: "victory" as const }] : []),
      ...(finalResult === "defeat" ? [{ type: "CombatEnded" as const, result: "defeat" as const }] : []),
      ...(reward && finalResult === "victory" ? [{ type: "RewardOffered" as const, rewardIds: reward.choices.map((choice) => choice.id) }] : []),
    ];
    const activePieceBlocked = finalResult === "ongoing" && !boardAfterGarbage.canPlace(state.combat.player.activePiece);
    const nextState: GameAppState = {
      ...state,
      scene: garbageDefeat ? "runResult" : runWon ? "runResult" : finalResult === "victory" ? "reward" : state.scene,
      runResult: garbageDefeat
        ? { result: "defeat", title: "Run Failed", message: "Board overflow: enemy garbage pushed the stack over the top." }
        : runWon
        ? { result: "victory", title: "Run Complete", message: "The boss falls. The route is clear." }
        : state.runResult,
      run: { ...state.run, status: runWon ? "complete" : finalResult === "victory" ? "reward" : state.run.status },
      combat: {
        ...state.combat,
        enemy: { ...state.combat.enemy, hp: nextEnemyHp, currentIntent: nextIntent, pendingGarbage: nextPendingGarbage, garbageQueue },
        telemetry: nextTelemetry,
        result: finalResult,
        lastAttack: damage,
        lastBaseAttack: attack.baseDamage,
        lastLinesCleared: linesCleared,
        lastSpinResult: spinResult,
        lastClearResult: clearResult,
        lastComboB2BResult: comboB2BResult,
        lastFeedbackEvent: feedbackEvent,
        lastBattleResultSummary: battleResultSummary,
        player: {
          ...state.combat.player,
          board: boardAfterGarbage,
          activePiece: state.combat.player.activePiece,
          combo: comboB2BResult.comboCount,
          comboDisplayCount: comboB2BResult.comboDisplayCount,
          backToBackActive: comboB2BResult.isBackToBack,
          backToBackCount: comboB2BResult.backToBackCount,
          actionCount: nextActionCount,
        },
        log: [...state.combat.log, ...combatEvents],
      },
      reward,
      events: [...state.events, ...combatEvents],
    };
    return activePieceBlocked
      ? triggerCombatGameOver(nextState, "spawnCollision", ["cannot place spawned piece", "gameOver triggered by spawn collision"], state.combat.player.activePiece)
      : nextState;
  }
}

function updateCombatTelemetry(input: {
  combat: CombatState;
  playerAttackGenerated: number;
  attackBlockedByPendingGarbage: number;
  damageDealtToEnemy: number;
  garbageQueued: number;
  garbageCancelled: number;
  garbageApplied: number;
  linesCleared: number;
  boardHeight: number;
}): CombatTelemetry {
  const telemetry = input.combat.telemetry ?? createInitialCombatTelemetry();
  return {
    ...telemetry,
    totalPlayerAttackGenerated: telemetry.totalPlayerAttackGenerated + input.playerAttackGenerated,
    totalAttackBlockedByPendingGarbage: telemetry.totalAttackBlockedByPendingGarbage + input.attackBlockedByPendingGarbage,
    totalDamageDealtToEnemy: telemetry.totalDamageDealtToEnemy + input.damageDealtToEnemy,
    totalGarbageQueued: telemetry.totalGarbageQueued + input.garbageQueued,
    totalGarbageCancelled: telemetry.totalGarbageCancelled + input.garbageCancelled,
    totalGarbageApplied: telemetry.totalGarbageApplied + input.garbageApplied,
    linesClearedTotal: telemetry.linesClearedTotal + input.linesCleared,
    maxBoardHeight: Math.max(telemetry.maxBoardHeight, input.boardHeight),
  };
}

function createBattleResultSummary(input: {
  state: GameAppState;
  telemetry: CombatTelemetry;
  finalBoardHeight: number;
  result: BattleResultSummary["result"];
}): BattleResultSummary {
  const combat = input.state.combat!;
  const run = input.state.run!;
  return {
    floor: run.progress.currentFloor,
    difficultyId: run.difficultyId ?? "standard",
    enemyId: combat.enemy.definition.id,
    enemyRole: combat.enemy.definition.role,
    enemyTraits: combat.enemy.definition.traits,
    calculatedEnemyStats: combat.enemy.calculatedStats,
    battleDurationSeconds: round(input.telemetry.battleDurationMs / 1000, 2),
    totalPlayerAttackGenerated: input.telemetry.totalPlayerAttackGenerated,
    totalAttackBlockedByPendingGarbage: input.telemetry.totalAttackBlockedByPendingGarbage,
    totalDamageDealtToEnemy: input.telemetry.totalDamageDealtToEnemy,
    totalGarbageQueued: input.telemetry.totalGarbageQueued,
    totalGarbageCancelled: input.telemetry.totalGarbageCancelled,
    totalGarbageApplied: input.telemetry.totalGarbageApplied,
    linesClearedTotal: input.telemetry.linesClearedTotal,
    estimatedSurvivalTax: input.telemetry.totalAttackBlockedByPendingGarbage + input.telemetry.totalGarbageApplied,
    maxBoardHeight: input.telemetry.maxBoardHeight,
    finalBoardHeight: input.finalBoardHeight,
    result: input.result,
    selectedRelics: run.relicInventory.relics.map((relic) => relic.definitionId),
  };
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
