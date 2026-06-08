import type { GameAppState } from "./GameAppState";
import { AttackCalculator } from "../domain/combat/AttackCalculator";
import { DamageResolver } from "../domain/combat/DamageResolver";
import { RewardGenerator } from "../domain/reward/RewardGenerator";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { relicRewardTable } from "../data/rewardTables";
import type { GameEvent } from "../domain/shared/GameEvent";
import { getCurrentNode } from "../domain/run/RunProgression";
import type { Board } from "../domain/tetris/Board";
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
import type { CombatState, NextAttackBuff, TimedAttackBuff } from "../domain/combat/CombatState";
import { triggerCombatGameOver } from "./CombatGameOver";
import { EffectResolver } from "../domain/relic/EffectResolver";
import { CompleteCurrentNodeUseCase } from "./CompleteCurrentNodeUseCase";
import type { TetrominoType } from "../domain/tetris/Cell";
import { modifierApplies, type ModifierContext } from "../domain/relic/Modifier";
import type { RelicDefinition } from "../domain/relic/RelicDefinition";
import { resolveRuntimeRuleSet } from "./ConditionalRuleSet";

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
    nowMs = 0,
    usedPieceType?: TetrominoType,
    boardBeforeLineClear?: Board,
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
      b2bCount: state.combat.player.backToBackCount,
      fastChain: state.combat.player.fastChainCount,
      speedBonusPerStack: state.combat.ruleSet.speedBonusPerStack,
      speedBonusCap: state.combat.ruleSet.speedBonusCap,
    });
    const fieldAnalyzer = new FieldAnalyzer();
    const attackFieldState = fieldAnalyzer.analyze(state.combat.player.board);
    const beforeLineClearFieldState = boardBeforeLineClear ? fieldAnalyzer.analyze(boardBeforeLineClear) : attackFieldState;
    const clearedHoleCount = calculateClearedHoleCount(beforeLineClearFieldState.holeCount, attackFieldState.holeCount, linesCleared);
    const consecutiveCounts = nextConsecutiveAttackCounts(
      state.combat.player.consecutiveTetrisCount,
      state.combat.player.consecutiveTSpinCount,
      linesCleared,
      clearResult,
    );
    let garbageQueue = new GarbageQueue(
      { entryDelayMs: garbageConfig.garbageEntryDelayMs },
      state.combat.enemy.garbageQueue?.getPackets() ??
        (state.combat.enemy.pendingGarbage
          ? [{ id: "garbage_1", lines: state.combat.enemy.pendingGarbage, source: "enemy", remainingMs: 0, initialDelayMs: 0 }]
          : []),
    );
    const attackContext: Omit<ModifierContext, "attack"> = {
      linesCleared,
      backToBackActive: state.combat.player.backToBackActive,
      b2bCount: state.combat.player.backToBackCount,
      isDanger: attackFieldState.dangerLevel === "Danger" || attackFieldState.dangerLevel === "Critical",
      fieldHeight: attackFieldState.maxHeight,
      holdUsedThisBattle: state.combat.player.holdUsedThisBattle,
      pendingGarbageLines: garbageQueue.getTotalAmount(),
      canceledGarbageLines: 0,
      isFast: state.combat.player.isFastState,
      fastChain: state.combat.player.fastChainCount,
      holeCount: attackFieldState.holeCount,
      clearedHoleCount,
      isTSpin: clearResult.isTSpin,
      isTSpinMini: clearResult.isTSpinMini,
      isTSpinFull: clearResult.isTSpin && !clearResult.isTSpinMini,
      isPerfectClear: clearResult.isPerfectClear,
      combo: baseAttack.comboAfter,
      comboBonus: baseAttack.comboBonus,
      comboDamage: baseAttack.comboDamage,
      attackKind: baseAttack.attackType,
      isB2BMultipleOf3: isPositiveMultiple(state.combat.player.backToBackCount, 3),
      isB2BMultipleOf10: isPositiveMultiple(state.combat.player.backToBackCount, 10),
      consecutiveTetrisCount: consecutiveCounts.consecutiveTetrisCount,
      consecutiveTSpinCount: consecutiveCounts.consecutiveTSpinCount,
      hasNextPieceT: state.combat.player.nextPieces.includes("T"),
      hasNextPieceI: state.combat.player.nextPieces.includes("I"),
      usedPieceType,
      isBoss: isBossRole(state.combat.enemy.definition.role),
    };
    const ownedRelics = state.run.relicInventory.getDefinitions();
    const hasAttack = hasAttackEvent(linesCleared, clearResult);
    const preCancelRelicAttack = hasAttack
      ? new EffectResolver().applyAttackModifiers(
          baseAttack,
          ownedRelics,
          attackContext,
          { includeDetails: true },
        )
      : undefined;
    const pendingTimedAttackBuffs = state.combat.player.timedAttackBuffs ?? [];
    const preCancelTimedAttack =
      hasAttack && pendingTimedAttackBuffs.length > 0
        ? new EffectResolver().applyAttackModifiers(
            preCancelRelicAttack?.attackResult ?? baseAttack,
            pendingTimedAttackBuffs.map(timedAttackBuffToRelic),
            attackContext,
            { includeDetails: true },
          )
        : undefined;
    const pendingNextAttackBuffs = state.combat.player.nextAttackBuffs ?? [];
    const preCancelBuffAttack =
      hasAttack && pendingNextAttackBuffs.length > 0
        ? new EffectResolver().applyAttackModifiers(
            preCancelTimedAttack?.attackResult ?? preCancelRelicAttack?.attackResult ?? baseAttack,
            pendingNextAttackBuffs.map(nextAttackBuffToRelic),
            attackContext,
            { includeDetails: true },
          )
        : undefined;
    const preCancelAttackResult =
      preCancelBuffAttack?.attackResult ?? preCancelTimedAttack?.attackResult ?? preCancelRelicAttack?.attackResult ?? baseAttack;
    const cancelResult = garbageQueue.cancelWithAttack(preCancelAttackResult.totalDamage);
    garbageQueue = cancelResult.queue;
    const canceledGarbageLines = cancelResult.cancelledGarbage;
    const finalAttackContext: Omit<ModifierContext, "attack"> = { ...attackContext, canceledGarbageLines };
    const relicAttack = hasAttack
      ? new EffectResolver().applyAttackModifiers(
          baseAttack,
          ownedRelics,
          finalAttackContext,
          { includeDetails: true },
        )
      : undefined;
    const timedAttack =
      hasAttack && pendingTimedAttackBuffs.length > 0
        ? new EffectResolver().applyAttackModifiers(
            relicAttack?.attackResult ?? baseAttack,
            pendingTimedAttackBuffs.map(timedAttackBuffToRelic),
            finalAttackContext,
            { includeDetails: true },
          )
        : undefined;
    const buffAttack =
      hasAttack && pendingNextAttackBuffs.length > 0
        ? new EffectResolver().applyAttackModifiers(
            timedAttack?.attackResult ?? relicAttack?.attackResult ?? baseAttack,
            pendingNextAttackBuffs.map(nextAttackBuffToRelic),
            finalAttackContext,
            { includeDetails: true },
          )
        : undefined;
    const finalAttackResult = buffAttack?.attackResult ?? timedAttack?.attackResult ?? relicAttack?.attackResult ?? baseAttack;
    const appliedRelicIds = uniqueStrings([
      ...(relicAttack?.appliedRelicIds ?? []),
      ...(timedAttack?.appliedRelicIds ?? []),
      ...(buffAttack?.appliedRelicIds ?? []),
    ]);
    const attack = {
      ...finalAttackResult,
      preRelicTotalDamage: relicAttack?.preRelicAttack ?? baseAttack.totalDamage,
      relicAttackBonus: finalAttackResult.totalDamage - (relicAttack?.preRelicAttack ?? baseAttack.totalDamage),
      appliedRelicIds,
    };
    const generatedNextAttackBuffs = hasAttack ? createNextAttackBuffs(ownedRelics, finalAttackContext) : [];
    const generatedTimedAttackBuffs = hasAttack ? createTimedAttackBuffs(ownedRelics, finalAttackContext) : [];
    const nextAttackBuffs = upsertNextAttackBuffs(hasAttack ? [] : pendingNextAttackBuffs, generatedNextAttackBuffs);
    const timedAttackBuffs = upsertTimedAttackBuffs(pendingTimedAttackBuffs, generatedTimedAttackBuffs);
    const cancelBonusDamage = Math.max(0, attack.totalDamage - preCancelAttackResult.totalDamage);
    const remainingAttackDamage = cancelResult.remainingAttackDamage;
    // Damage order: player attack cancels pending garbage first, then remaining attack is reduced by enemy defense.
    const damage = new DamageResolver().resolve(state.combat.enemy.definition, remainingAttackDamage, linesCleared) + cancelBonusDamage;
    const comboB2BResult = new ComboB2BTracker({
      comboCount: state.combat.player.combo,
      comboDisplayCount: state.combat.player.comboDisplayCount,
      isComboActive: state.combat.player.combo > 1,
      isBackToBack: state.combat.player.backToBackActive,
      backToBackCount: state.combat.player.backToBackCount,
    }, this.comboB2BConfig).next(clearResult);
    const nextActionCount = state.combat.player.actionCount + 1;
    const readyResult = linesCleared === 0 ? garbageQueue.popReadyLines(garbageConfig.maxGarbageApplyPerLock) : { queue: garbageQueue, linesToApply: 0, packets: [] };
    garbageQueue = readyResult.queue;
    const garbageResult = new GarbageApplier().apply(state.combat.player.board, readyResult.packets, this.random);
    const boardAfterGarbage = garbageResult.appliedLines > 0 ? garbageResult.board : state.combat.player.board;
    const garbageDefeat = garbageResult.appliedLines > 0 && garbageResult.overflow;
    const dangerState = new FieldAnalyzer().analyze(boardAfterGarbage);
    const nextEnemyHp = Math.max(0, state.combat.enemy.hp - damage);
    const damageDealtToEnemy = Math.min(state.combat.enemy.hp, damage);
    const feedbackEvent = new CombatFeedbackEventFactory().create({
      clearResult,
      attackResult: attack,
      comboB2BResult,
      dangerState,
      damageDealtToEnemy,
      offsetAmount: cancelResult.cancelledGarbage,
    });
    const result = nextEnemyHp <= 0 ? "victory" : "ongoing";
    const currentNode = getCurrentNode(state.run.progress);
    const runWon = result === "victory" && currentNode?.type === "finalBoss";
    const nextTelemetry = updateCombatTelemetry({
      combat: state.combat,
      playerAttackGenerated: attack.totalDamage,
      attackBlockedByPendingGarbage: cancelResult.cancelledGarbage,
      damageDealtToEnemy,
      garbageQueued: 0,
      garbageCancelled: cancelResult.cancelledGarbage,
      garbageApplied: garbageResult.appliedLines,
      linesCleared,
      boardHeight: dangerState.maxHeight,
    });
    const nextIntent = state.combat.enemy.currentIntent;
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
    const rewardChoices = finalResult === "victory" && !runWon ? new RewardGenerator(relicRewardTable, this.random).generate(3, state.run.relicInventory) : [];
    const reward = finalResult === "victory" && !runWon && rewardChoices.length > 0 ? { choices: rewardChoices } : state.reward;
    const combatEvents: GameEvent[] = [
      { type: "SpinDetected" as const, spinResult },
      ...(linesCleared > 0 ? [{ type: "LineCleared" as const, lines: linesCleared, spinResult, clearResult }] : []),
      ...(linesCleared === 4 ? [{ type: "TetrisCleared" as const }] : []),
      ...(isPerfectClear ? [{ type: "PerfectClearAchieved" as const }] : []),
      ...(comboB2BResult.comboCount !== state.combat.player.combo ? [{ type: "ComboChanged" as const, combo: comboB2BResult.comboCount }] : []),
      ...(comboB2BResult.isBackToBack !== state.combat.player.backToBackActive ? [{ type: "BackToBackChanged" as const, active: comboB2BResult.isBackToBack }] : []),
      {
        type: "AttackCalculated",
        baseAttack: attack.baseAttack,
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
      ...readyResult.packets.map((packet, index) => ({
        type: "GarbageApplied" as const,
        lines: packet.lines,
        holeX: garbageResult.holes[index] ?? 0,
      })),
      { type: "CombatFeedback" as const, feedback: feedbackEvent },
      ...(finalResult === "victory" ? [{ type: "CombatEnded" as const, result: "victory" as const }] : []),
      ...(finalResult === "defeat" ? [{ type: "CombatEnded" as const, result: "defeat" as const }] : []),
      ...(reward && finalResult === "victory" ? [{ type: "RewardOffered" as const, rewardIds: reward.choices.map((choice) => choice.id) }] : []),
    ];
    const activePieceBlocked = finalResult === "ongoing" && !boardAfterGarbage.canPlace(state.combat.player.activePiece);
    const nextCombatForRuleSet: CombatState = {
      ...state.combat,
      player: {
        ...state.combat.player,
        board: boardAfterGarbage,
        combo: comboB2BResult.comboCount,
        backToBackActive: comboB2BResult.isBackToBack,
      },
      enemy: { ...state.combat.enemy, garbageQueue },
    };
    const runtimeRuleSet = resolveRuntimeRuleSet(nextCombatForRuleSet);
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
        ruleSet: runtimeRuleSet,
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
          consecutiveTetrisCount: consecutiveCounts.consecutiveTetrisCount,
          consecutiveTSpinCount: consecutiveCounts.consecutiveTSpinCount,
          actionCount: nextActionCount,
          nextAttackBuffs,
          timedAttackBuffs,
        },
        log: [...state.combat.log, ...combatEvents],
      },
      reward,
      events: [...state.events, ...combatEvents],
    };
    if (activePieceBlocked) {
      return triggerCombatGameOver(nextState, "spawnCollision", ["cannot place spawned piece", "gameOver triggered by spawn collision"], state.combat.player.activePiece);
    }
    return finalResult === "victory" && !runWon && rewardChoices.length === 0 ? new CompleteCurrentNodeUseCase().execute(nextState) : nextState;
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
    difficultyId: run.difficultyId ?? "normal",
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

function isPositiveMultiple(value: number, divisor: number): boolean {
  return value > 0 && value % divisor === 0;
}

function isBossRole(role: string): boolean {
  return role === "boss" || role === "finalBoss";
}

function hasAttackEvent(linesCleared: number, clearResult: ClearResult): boolean {
  return linesCleared > 0 || clearResult.isTSpin || clearResult.isPerfectClear;
}

export function nextConsecutiveAttackCounts(
  currentTetrisCount: number | undefined,
  currentTSpinCount: number | undefined,
  linesCleared: number,
  clearResult: ClearResult,
): Pick<NonNullable<CombatState["player"]>, "consecutiveTetrisCount" | "consecutiveTSpinCount"> {
  if (linesCleared === 4 && !clearResult.isTSpin) {
    return { consecutiveTetrisCount: sanitizeCounter(currentTetrisCount) + 1, consecutiveTSpinCount: 0 };
  }

  if (linesCleared > 0 && clearResult.isTSpin) {
    return { consecutiveTetrisCount: 0, consecutiveTSpinCount: sanitizeCounter(currentTSpinCount) + 1 };
  }

  return { consecutiveTetrisCount: 0, consecutiveTSpinCount: 0 };
}

export function calculateClearedHoleCount(beforeHoleCount: number, afterHoleCount: number, linesCleared: number): number {
  if (linesCleared <= 0) return 0;
  return Math.max(0, beforeHoleCount - afterHoleCount);
}

function sanitizeCounter(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function nextAttackBuffToRelic(buff: NextAttackBuff): RelicDefinition {
  return {
    id: buff.sourceRelicId,
    name: buff.sourceRelicId,
    description: "Runtime next attack buff.",
    category: "legacy",
    rarity: "common",
    maxStacks: 1,
    obtainSource: "disabled",
    modifiers: [{ trigger: "onAttackCalculated", flatBonusAdd: buff.flatBonusAdd }],
  };
}

function timedAttackBuffToRelic(buff: TimedAttackBuff): RelicDefinition {
  return {
    id: buff.sourceRelicId,
    name: buff.sourceRelicId,
    description: "Runtime timed attack buff.",
    category: "legacy",
    rarity: "common",
    maxStacks: 1,
    obtainSource: "disabled",
    modifiers: [{ trigger: "onAttackCalculated", stateBonusAdd: buff.stateBonusAdd }],
  };
}

function createNextAttackBuffs(relics: RelicDefinition[], context: Omit<ModifierContext, "attack">): NextAttackBuff[] {
  const buffs: NextAttackBuff[] = [];
  for (const relic of relics) {
    for (const modifier of relic.modifiers) {
      if (modifier.trigger !== "onAttackResolved") continue;
      if (modifier.durationMs !== undefined) continue;
      if (!modifierApplies(modifier, { ...context, attack: 0 })) continue;
      buffs.push({
        sourceRelicId: String(relic.id),
        flatBonusAdd: sanitizeOptionalNumber(modifier.flatBonusAdd),
      });
    }
  }
  return buffs;
}

function createTimedAttackBuffs(relics: RelicDefinition[], context: Omit<ModifierContext, "attack">): TimedAttackBuff[] {
  const buffs: TimedAttackBuff[] = [];
  for (const relic of relics) {
    for (const modifier of relic.modifiers) {
      if (modifier.trigger !== "onAttackResolved") continue;
      const durationMs = sanitizeDurationMs(modifier.durationMs);
      if (durationMs === undefined) continue;
      if (!modifierApplies(modifier, { ...context, attack: 0 })) continue;
      buffs.push({
        sourceRelicId: String(relic.id),
        remainingMs: durationMs,
        stateBonusAdd: sanitizeOptionalNumber(modifier.stateBonusAdd),
      });
    }
  }
  return buffs;
}

function upsertNextAttackBuffs(current: NextAttackBuff[], incoming: NextAttackBuff[]): NextAttackBuff[] {
  const bySource = new Map<string, NextAttackBuff>();
  for (const buff of current) bySource.set(buff.sourceRelicId, buff);
  for (const buff of incoming) bySource.set(buff.sourceRelicId, buff);
  return [...bySource.values()];
}

function upsertTimedAttackBuffs(current: TimedAttackBuff[], incoming: TimedAttackBuff[]): TimedAttackBuff[] {
  const bySource = new Map<string, TimedAttackBuff>();
  for (const buff of current) bySource.set(buff.sourceRelicId, buff);
  for (const buff of incoming) bySource.set(buff.sourceRelicId, buff);
  return [...bySource.values()];
}

function sanitizeOptionalNumber(value: number | undefined): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

function sanitizeDurationMs(value: number | undefined): number | undefined {
  if (!Number.isFinite(value) || value === undefined) return undefined;
  return Math.max(0, Math.round(value));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
