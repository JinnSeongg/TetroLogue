import type { GameAppState } from "./GameAppState";
import type { RandomProvider } from "../domain/shared/RandomProvider";
import { MovementSystem } from "../domain/tetris/MovementSystem";
import { standardRuleSet, type TetrisRuleSet } from "../domain/tetris/TetrisRuleSet";
import { LockActivePieceUseCase } from "./LockActivePieceUseCase";
import type { InitialActionState } from "./input/InitialActionState";

export class TickCombatUseCase {
  constructor(
    private readonly random: RandomProvider,
    private readonly ruleSet: TetrisRuleSet = standardRuleSet,
  ) {}

  execute(state: GameAppState, deltaMs: number, softDrop = false, nowMs = 0, initialAction?: InitialActionState): GameAppState {
    const combat = state.combat;
    const piece = combat?.player.activePiece;
    if (!combat || !piece || combat.result !== "ongoing") return state;

    const player = combat.player;
    // softDropGravityMs is gameplay rule data, not a player input preference.
    // Future relic/enemy/rule modifiers should adjust the active rule value before this tick reads it.
    const gravityTarget = softDrop ? this.ruleSet.softDropGravityMs : this.ruleSet.gravityMs;
    const softDropJustActivated = softDrop && !player.softDropActive;
    const canFall = player.board.canPlace(piece.move(0, 1));

    if (!canFall) {
      const groundedSinceMs = player.isGrounded ? player.groundedSinceMs : nowMs;
      const nextLockElapsed = (player.isGrounded ? player.lockElapsedMs : 0) + deltaMs;
      if (nextLockElapsed >= this.ruleSet.lockDelayMs) {
        return new LockActivePieceUseCase(this.random, this.ruleSet).execute(state, piece, initialAction);
      }
      return {
        ...state,
        combat: {
          ...combat,
          player: {
            ...player,
          lockElapsedMs: nextLockElapsed,
          softDropActive: softDrop,
          isGrounded: true,
          groundedSinceMs,
          lastSpinAction: softDrop ? undefined : player.lastSpinAction,
        },
      },
    };
    }

    const elapsed = (softDropJustActivated ? 0 : player.gravityElapsedMs) + deltaMs;
    if (elapsed < gravityTarget) {
      return {
        ...state,
        combat: {
          ...combat,
          player: {
            ...player,
            gravityElapsedMs: elapsed,
          lockElapsedMs: 0,
          softDropActive: softDrop,
          isGrounded: false,
          groundedSinceMs: undefined,
          lastSpinAction: softDrop ? undefined : player.lastSpinAction,
        },
      },
    };
    }

    const moved = new MovementSystem().tryMove(player.board, piece, 0, 1);
    const movedIsGrounded = !player.board.canPlace(moved.move(0, 1));
    return {
      ...state,
      combat: {
        ...combat,
        player: {
          ...player,
          activePiece: moved,
          gravityElapsedMs: elapsed - gravityTarget,
          lockElapsedMs: 0,
          softDropActive: softDrop,
          isGrounded: movedIsGrounded,
          groundedSinceMs: movedIsGrounded ? nowMs : undefined,
          lastSpinAction: softDrop ? undefined : player.lastSpinAction,
        },
      },
    };
  }
}
