import { describe, expect, it } from "vitest";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { LockActivePieceUseCase } from "../application/LockActivePieceUseCase";
import { TickCombatUseCase } from "../application/TickCombatUseCase";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import { Board } from "../domain/tetris/Board";
import type { Cell } from "../domain/tetris/Cell";
import { createEnteredSpawnPiece, createSpawnPiece, SPAWN_Y_OFFSET, INITIAL_SPAWN_DROP_ROWS } from "../domain/tetris/SpawnRules";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

describe("hidden row game over rules", () => {
  it("allows hidden-row cells during placement checks and ignores board occupancy above the field", () => {
    const board = filledRowsBoard(10, 20, [0]);

    expect(board.canPlace(new ActivePiece("O", { x: 4, y: -2 }))).toBe(true);
    expect(board.canPlace(new ActivePiece("O", { x: 4, y: -1 }))).toBe(false);
  });

  it("spawns two rows higher and applies the initial one-row entry drop when possible", () => {
    const board = Board.create(10, 20);
    const piece = createEnteredSpawnPiece("T", board, { boardWidth: 10 });

    expect(piece.position).toEqual({ x: 4, y: SPAWN_Y_OFFSET + INITIAL_SPAWN_DROP_ROWS });
  });

  it("uses spawn config to shift every piece one column left from the center origin", () => {
    const board = Board.create(10, 20);
    const types = ["I", "O", "T", "S", "Z", "J", "L"] as const;

    for (const type of types) {
      expect(createEnteredSpawnPiece(type, board, { boardWidth: 10 }).position.x).toBe(4);
    }
  });

  it("aligns the O piece top edge with the shared spawn baseline", () => {
    const board = Board.create(10, 20);
    const tPiece = createEnteredSpawnPiece("T", board, { boardWidth: 10 });
    const oPiece = createEnteredSpawnPiece("O", board, { boardWidth: 10 });

    expect(topY(oPiece)).toBe(topY(tPiece));
    expect(createSpawnPiece("O", { boardWidth: 10 }).position.y).toBe(SPAWN_Y_OFFSET - 1);
  });

  it("defeats on lock-out when a piece locks while any block remains hidden", () => {
    const random = new SeededRandomProvider(1);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    if (!state.combat) throw new Error("Expected combat");
    const primed = {
      ...state,
      combat: {
        ...state.combat,
        player: {
          ...state.combat.player,
          activePiece: new ActivePiece("O", { x: 4, y: -1 }),
        },
      },
    };

    const result = new LockActivePieceUseCase(random).execute(primed);

    expect(result.combat?.result).toBe("defeat");
    expect(result.events).toContainEqual({ type: "CombatDiagnostic", message: "lock-out detected" });
  });

  it("defeats instead of soft-locking when activePiece is missing during ongoing combat", () => {
    const random = new SeededRandomProvider(1);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    if (!state.combat) throw new Error("Expected combat");
    const broken = {
      ...state,
      combat: {
        ...state.combat,
        player: { ...state.combat.player, activePiece: undefined },
      },
    };

    const result = new TickCombatUseCase(random).execute(broken, 16);

    expect(result.combat?.result).toBe("defeat");
    expect(result.events).toContainEqual({ type: "CombatDiagnostic", message: "activePiece missing during active combat" });
  });
});

function filledRowsBoard(width: number, height: number, rows: number[]): Board {
  const filledRows = new Set(rows);
  const cells: Cell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, () => (filledRows.has(y) ? { filled: true, pieceType: "Z" as const } : { filled: false })),
  );
  return new Board(width, height, cells);
}

function topY(piece: ActivePiece): number {
  return Math.min(...piece.blocks().map((block) => block.y));
}
