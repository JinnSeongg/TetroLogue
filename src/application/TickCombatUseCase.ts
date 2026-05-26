import type { GameAppState } from "./GameAppState";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { MovementSystem } from "../domain/tetris/MovementSystem";
import { standardRuleSet, type TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";
import { LockActivePieceUseCase } from "./LockActivePieceUseCase";
import type { InitialActionState } from "./input/InitialActionState";
import type { CombatState } from "../domain/combat/CombatState";
import { createInitialCombatTelemetry } from "../domain/combat/BattleResultSummary";
import { triggerCombatGameOver } from "./CombatGameOver";

export class TickCombatUseCase {
  constructor(
    private readonly random: RandomProvider,
    private readonly ruleSet: TetrisRuleSet = standardRuleSet,
  ) {}

  execute(state: GameAppState, deltaMs: number, softDropSteps = 0, nowMs = 0, initialAction?: InitialActionState): GameAppState {
    const combat = state.combat;
    const piece = combat?.player.activePiece;
    if (!combat || combat.result !== "ongoing") return state;
    if (!piece) {
      return triggerCombatGameOver(state, "missingActivePiece", ["activePiece missing during active combat"]);
    }

    const combatWithElapsed = addBattleDuration(combat, deltaMs);
    const player = combatWithElapsed.player;
    const movement = new MovementSystem();
    const softDrop = applySoftDropSteps(player.board, piece, movement, softDropSteps);
    const activePiece = softDrop.piece;
    const actionSoundEvents = Array.from({ length: softDrop.stepsMoved }, () => ({ type: "PlayerActionSucceeded" as const, action: "softDrop" as const }));
    const canFall = player.board.canPlace(activePiece.move(0, 1));

    if (!canFall) {
      const groundedSinceMs = player.isGrounded ? player.groundedSinceMs : nowMs;
      const nextLockElapsed = softDrop.stepsMoved > 0 ? 0 : (player.isGrounded ? player.lockElapsedMs : 0) + deltaMs;
      if (nextLockElapsed >= this.ruleSet.lockDelayMs) {
        const stateAfterSoftDrop = {
          ...state,
          combat: { ...combatWithElapsed, player: { ...player, activePiece } },
          events: actionSoundEvents.length > 0 ? [...state.events, ...actionSoundEvents] : state.events,
        };
        return new LockActivePieceUseCase(this.random, this.ruleSet).execute(stateAfterSoftDrop, activePiece, initialAction, nowMs);
      }
      return {
        ...state,
        combat: {
          ...combatWithElapsed,
          player: {
            ...player,
            activePiece,
            lockElapsedMs: nextLockElapsed,
            softDropActive: softDropSteps > 0,
            isGrounded: true,
            groundedSinceMs,
            gravityElapsedMs: softDrop.stepsMoved > 0 ? 0 : player.gravityElapsedMs,
            lastSpinAction: softDrop.stepsMoved > 0 ? undefined : player.lastSpinAction,
          },
        },
        events: actionSoundEvents.length > 0 ? [...state.events, ...actionSoundEvents] : state.events,
      };
    }

    const elapsed = (softDrop.stepsMoved > 0 ? 0 : player.gravityElapsedMs) + deltaMs;
    if (elapsed < this.ruleSet.gravityMs) {
      return {
        ...state,
        combat: {
          ...combatWithElapsed,
          player: {
            ...player,
            activePiece,
            gravityElapsedMs: elapsed,
            lockElapsedMs: 0,
            softDropActive: softDropSteps > 0,
            isGrounded: false,
            groundedSinceMs: undefined,
            lastSpinAction: softDrop.stepsMoved > 0 ? undefined : player.lastSpinAction,
          },
        },
        events: actionSoundEvents.length > 0 ? [...state.events, ...actionSoundEvents] : state.events,
      };
    }

    const moved = movement.tryMove(player.board, activePiece, 0, 1);
    const movedIsGrounded = !player.board.canPlace(moved.move(0, 1));
    return {
      ...state,
      combat: {
        ...combatWithElapsed,
        player: {
          ...player,
          activePiece: moved,
          gravityElapsedMs: elapsed - this.ruleSet.gravityMs,
          lockElapsedMs: 0,
          softDropActive: softDropSteps > 0,
          isGrounded: movedIsGrounded,
          groundedSinceMs: movedIsGrounded ? nowMs : undefined,
          lastSpinAction: softDrop.stepsMoved > 0 ? undefined : player.lastSpinAction,
        },
      },
      events: actionSoundEvents.length > 0 ? [...state.events, ...actionSoundEvents] : state.events,
    };
  }
}

function applySoftDropSteps(
  board: CombatState["player"]["board"],
  piece: NonNullable<CombatState["player"]["activePiece"]>,
  movement: MovementSystem,
  requestedSteps: number,
): { piece: NonNullable<CombatState["player"]["activePiece"]>; stepsMoved: number } {
  let current = piece;
  let stepsMoved = 0;
  const steps = Math.max(0, Math.floor(requestedSteps));
  for (let index = 0; index < steps; index += 1) {
    if (!board.canPlace(current.move(0, 1))) break;
    const next = movement.tryMove(board, current, 0, 1);
    if (next.position.y !== current.position.y + 1) break;
    current = next;
    stepsMoved += 1;
  }
  return { piece: current, stepsMoved };
}

function addBattleDuration(combat: CombatState, deltaMs: number): CombatState {
  const safeDelta = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
  return {
    ...combat,
    telemetry: {
      ...(combat.telemetry ?? createInitialCombatTelemetry()),
      battleDurationMs: (combat.telemetry?.battleDurationMs ?? 0) + safeDelta,
    },
  };
}
