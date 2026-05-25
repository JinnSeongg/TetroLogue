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
    const attack = new AttackCalculator().calculate({
      lineClearCount: linesCleared,
      spinResult,
      isPerfectClear,
      comboBefore: Math.max(0, state.combat.player.combo),
      wasB2BActive: state.combat.player.backToBackActive,
    });
    const garbageQueue = new GarbageQueue(
      { defaultDelay: garbageConfig.defaultIncomingGarbageDelay },
      state.combat.enemy.garbageQueue?.getPackets() ??
        (state.combat.enemy.pendingGarbage
          ? [{ id: "garbage_1", amount: state.combat.enemy.pendingGarbage, source: "legacy_pending", remainingDelay: 0 }]
          : []),
    );
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
    const result = nextEnemyHp <= 0 ? "victory" : "ongoing";
    const currentNode = getCurrentNode(state.run.progress);
    const runWon = result === "victory" && currentNode?.type === "finalBoss";
    const canCreateIntent = result === "ongoing" && !garbageDefeat;
    const generatedIntent = canCreateIntent ? new EnemyPatternSystem().nextIntent(state.combat.enemy.definition, nextActionCount) : undefined;
    if (generatedIntent?.garbageLines) {
      garbageQueue.enqueue(generatedIntent.garbageLines, generatedIntent.id);
    }
    const nextIntent = generatedIntent ?? state.combat.enemy.currentIntent;
    const nextPendingGarbage = garbageQueue.getTotalAmount();
    const finalResult = garbageDefeat ? "defeat" : result;
    const reward = finalResult === "victory" && !runWon ? { choices: new RewardGenerator(relicRewardTable, this.random).generate(3) } : state.reward;
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
    return {
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
        result: finalResult,
        lastAttack: damage,
        lastBaseAttack: attack.baseDamage,
        lastLinesCleared: linesCleared,
        lastSpinResult: spinResult,
        lastClearResult: clearResult,
        lastComboB2BResult: comboB2BResult,
        lastFeedbackEvent: feedbackEvent,
        player: {
          ...state.combat.player,
          board: boardAfterGarbage,
          activePiece: boardAfterGarbage.canPlace(state.combat.player.activePiece!) ? state.combat.player.activePiece : undefined,
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
  }
}
