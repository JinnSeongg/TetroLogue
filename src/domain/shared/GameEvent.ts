import type { SpinResult } from "../tetris/SpinDetector";
import type { AttackResult } from "../combat/AttackTypes";
import type { ClearResult } from "../tetris/ClearResult";
import type { CombatFeedbackEvent } from "../combat/CombatFeedbackEvent";

export type GameEvent =
  | { type: "CombatStarted"; enemyId: string }
  | { type: "PieceSpawned"; pieceType: string }
  | { type: "PiecePlaced"; pieceType: string }
  | { type: "LineCleared"; lines: number; spinResult?: SpinResult; clearResult?: ClearResult }
  | { type: "TetrisCleared" }
  | { type: "SpinDetected"; spinResult: SpinResult }
  | { type: "ComboChanged"; combo: number }
  | { type: "BackToBackChanged"; active: boolean }
  | { type: "PerfectClearAchieved" }
  | {
      type: "AttackCalculated";
      baseAttack: number;
      finalAttack: number;
      baseDamage?: number;
      totalDamage?: number;
      preRelicTotalDamage?: number;
      relicAttackBonus?: number;
      appliedRelicIds?: string[];
      actionName?: string;
      lineClearCount?: number;
      spinResult?: SpinResult;
      clearResult?: ClearResult;
      attackResult?: AttackResult;
    }
  | { type: "EnemyDamaged"; enemyId: string; damage: number; remainingHp: number }
  | { type: "EnemyIntentChanged"; enemyId: string; intentId: string; description: string; garbageLines: number }
  | { type: "GarbagePending"; lines: number; dueActionCount: number }
  | { type: "GarbageCanceled"; canceledLines: number; remainingPending: number }
  | { type: "GarbageApplied"; lines: number; holeX: number }
  | { type: "CombatFeedback"; feedback: CombatFeedbackEvent }
  | { type: "CombatDiagnostic"; message: string }
  | { type: "LockResetLimitReached"; count: number }
  | { type: "PlayerActionSucceeded"; action: "move" | "rotate" | "softDrop" }
  | { type: "FastStateChanged"; active: boolean; fastChainCount: number }
  | { type: "CombatEnded"; result: "victory" | "defeat" }
  | { type: "RewardOffered"; rewardIds: string[] }
  | { type: "RewardSelected"; rewardId: string }
  | { type: "NodeEntered"; nodeId: string };
