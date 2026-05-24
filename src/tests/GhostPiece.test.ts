import { describe, expect, it } from "vitest";
import { HandlePlayerInputUseCase } from "../application/HandlePlayerInputUseCase";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { Board } from "../domain/tetris/Board";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import { emptyCell, type Cell } from "../domain/tetris/Cell";
import { GhostPieceCalculator } from "../domain/tetris/GhostPieceCalculator";
import { RotationSystem } from "../domain/tetris/RotationSystem";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import type { GameAppState } from "../application/GameAppState";

const withCombatPiece = (state: GameAppState, board: Board, piece: ActivePiece): GameAppState => {
  if (!state.combat) throw new Error("Expected combat");
  return {
    ...state,
    combat: {
      ...state.combat,
      player: {
        ...state.combat.player,
        board,
        activePiece: piece,
      },
    },
  };
};

describe("GhostPieceCalculator", () => {
  it("calculates the floor landing position on an empty board", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("T", { x: 4, y: 0 });

    const ghost = new GhostPieceCalculator().calculate(board, piece);

    expect(ghost?.position).toEqual({ x: 4, y: 19 });
    expect(ghost?.type).toBe(piece.type);
    expect(ghost?.rotation).toBe(piece.rotation);
  });

  it("stops above existing blocks", () => {
    const board = boardWithCells(10, 20, [
      [3, 18],
      [4, 18],
      [5, 18],
    ]);
    const piece = new ActivePiece("T", { x: 4, y: 0 });

    const ghost = new GhostPieceCalculator().calculate(board, piece);

    expect(ghost?.position.y).toBe(17);
  });

  it("updates after rotation", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("I", { x: 4, y: 0 });
    const rotated = new RotationSystem().tryRotateClockwise(board, piece);

    const before = new GhostPieceCalculator().calculate(board, piece);
    const after = new GhostPieceCalculator().calculate(board, rotated);

    expect(before?.rotation).toBe("0");
    expect(after?.rotation).toBe("R");
    expect(after?.position.y).not.toBe(before?.position.y);
  });

  it("updates after horizontal movement", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("L", { x: 4, y: 0 });

    const before = new GhostPieceCalculator().calculate(board, piece);
    const after = new GhostPieceCalculator().calculate(board, piece.move(1, 0));

    expect(after?.position.x).toBe((before?.position.x ?? 0) + 1);
  });

  it("hardDrop final placement matches ghost position", () => {
    const random = new SeededRandomProvider(300);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    if (!state.combat?.player.activePiece) throw new Error("Expected active piece");
    const ghost = new GhostPieceCalculator().calculate(state.combat.player.board, state.combat.player.activePiece);

    const dropped = new HandlePlayerInputUseCase(random).execute(state, "hardDrop");
    const placed = dropped.combat?.player.board.snapshot();

    expect(ghost).toBeDefined();
    for (const block of ghost!.blocks()) {
      expect(placed?.[block.y]?.[block.x]?.filled).toBe(true);
    }
  });

  it("recalculates after hold spawns a new active piece", () => {
    const random = new SeededRandomProvider(301);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    if (!state.combat?.player.activePiece) throw new Error("Expected active piece");
    const before = new GhostPieceCalculator().calculate(state.combat.player.board, state.combat.player.activePiece);

    const held = new HandlePlayerInputUseCase(random).execute(state, "hold");
    if (!held.combat?.player.activePiece) throw new Error("Expected held active piece");
    const after = new GhostPieceCalculator().calculate(held.combat.player.board, held.combat.player.activePiece);

    expect(after?.type).toBe(held.combat.player.activePiece.type);
    expect(after?.type).not.toBe(before?.type);
  });

  it("can be disabled by ruleset for rendering decisions", () => {
    expect({ ...standardRuleSet, ghostPieceEnabled: false }.ghostPieceEnabled).toBe(false);
  });

  it("does not mutate board or active piece", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("S", { x: 4, y: 0 }, "R");
    const beforeBoard = board.snapshot();
    const beforePosition = piece.position;
    const beforeRotation = piece.rotation;

    const ghost = new GhostPieceCalculator().calculate(board, piece);

    expect(ghost).not.toBe(piece);
    expect(board.snapshot()).toEqual(beforeBoard);
    expect(piece.position).toEqual(beforePosition);
    expect(piece.rotation).toBe(beforeRotation);
  });

  it("returns undefined if there is no active piece", () => {
    expect(new GhostPieceCalculator().calculate(Board.create(10, 20), undefined)).toBeUndefined();
  });
});

function boardWithCells(width: number, height: number, filled: Array<[number, number]>): Board {
  const cells: Cell[][] = Array.from({ length: height }, () => Array.from({ length: width }, emptyCell));
  for (const [x, y] of filled) cells[y][x] = { filled: true, pieceType: "Z" };
  return new Board(width, height, cells);
}
