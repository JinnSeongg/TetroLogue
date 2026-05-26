import { describe, expect, it } from "vitest";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import { Board } from "../domain/tetris/Board";
import { emptyCell, type Cell, type TetrominoType } from "../domain/tetris/Cell";
import { noSpinResult, SrsSpinDetector, type LastSpinAction, type SpinResult } from "../domain/tetris/SpinDetector";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { HandlePlayerInputUseCase } from "../application/HandlePlayerInputUseCase";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import { TickCombatUseCase } from "../application/TickCombatUseCase";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";

const tRotation: LastSpinAction = {
  pieceType: "T",
  direction: "CW",
  from: "L",
  to: "0",
  usedKickIndex: 0,
  usedKickOffset: { x: 0, y: 0 },
  success: true,
};

describe("SrsSpinDetector", () => {
  it("returns None for every piece when lastSpinAction is null", () => {
    const detector = new SrsSpinDetector();
    const board = Board.create(10, 20);

    for (const pieceType of ["I", "O", "T", "S", "Z", "J", "L"] as TetrominoType[]) {
      expect(detector.detect(board, new ActivePiece(pieceType, { x: 4, y: 4 }))).toEqual(noSpinResult());
    }
  });

  it("returns None when a rotated T has two or fewer occupied corners", () => {
    const board = boardWithCells(10, 20, [
      [3, 5],
      [5, 5],
    ]);

    expect(new SrsSpinDetector().detect(board, new ActivePiece("T", { x: 4, y: 4 }), tRotation)).toEqual(noSpinResult());
  });

  it("detects TSpin Full when both front corners and at least three total corners are occupied", () => {
    const board = boardWithCells(10, 20, [
      [3, 3],
      [5, 3],
      [3, 5],
    ]);

    expect(new SrsSpinDetector().detect(board, new ActivePiece("T", { x: 4, y: 4 }), tRotation)).toEqual(
      spinResult({ kind: "TSpin", grade: "Full", pieceType: "T", method: "TCorner", rotationState: "0", kickIndex: 0 }),
    );
  });

  it("detects TSpin Mini when one front corner and at least three total corners are occupied", () => {
    const board = boardWithCells(10, 20, [
      [3, 3],
      [3, 5],
      [5, 5],
    ]);

    expect(new SrsSpinDetector().detect(board, new ActivePiece("T", { x: 4, y: 4 }), tRotation)).toEqual(
      spinResult({ kind: "TSpin", grade: "Mini", pieceType: "T", method: "TCorner", rotationState: "0", kickIndex: 0 }),
    );
  });

  it("promotes TSpin Mini to Full when the final SRS kick candidate was used", () => {
    const board = boardWithCells(10, 20, [
      [3, 5],
      [3, 3],
      [5, 3],
    ]);
    const finalKickRotation: LastSpinAction = { ...tRotation, from: "0", to: "R", usedKickIndex: 4 };

    expect(new SrsSpinDetector().detect(board, new ActivePiece("T", { x: 4, y: 4 }, "R"), finalKickRotation)).toEqual(
      spinResult({ kind: "TSpin", grade: "Full", pieceType: "T", method: "TCorner", rotationState: "R", kickIndex: 4 }),
    );
  });

  it.each(["J", "L", "S", "Z", "I"] as TetrominoType[])("detects AllSpin Full for an immobile rotated %s", (pieceType) => {
    const piece = new ActivePiece(pieceType, { x: 4, y: 4 }, "R");
    const board = boardAllowingOnlyPiece(10, 20, piece);
    const rotation = spinActionFor(pieceType);

    expect(new SrsSpinDetector().detect(board, piece, rotation)).toEqual(
      spinResult({ kind: "AllSpin", grade: "Full", pieceType, method: "Immobile", rotationState: "R", kickIndex: 0 }),
    );
  });

  it.each(["J", "L", "S", "Z", "I"] as TetrominoType[])("returns None for a rotated %s when any direction is movable", (pieceType) => {
    const piece = new ActivePiece(pieceType, { x: 4, y: 4 }, "R");

    expect(new SrsSpinDetector().detect(Board.create(10, 20), piece, spinActionFor(pieceType))).toEqual(noSpinResult());
  });

  it("returns None for O even when immobile", () => {
    const piece = new ActivePiece("O", { x: 4, y: 4 }, "R");
    const board = boardAllowingOnlyPiece(10, 20, piece);

    expect(new SrsSpinDetector().detect(board, piece, spinActionFor("O"))).toEqual(noSpinResult());
  });

  it("counts out-of-board T corners as occupied", () => {
    const board = boardWithCells(10, 20, [[1, 0]]);
    const piece = new ActivePiece("T", { x: 0, y: 1 }, "R");
    const rotateToRight: LastSpinAction = { ...tRotation, from: "0", to: "R" };

    expect(new SrsSpinDetector().detect(board, piece, rotateToRight).kind).toBe("TSpin");
  });

  it("does not mutate the board while detecting spins", () => {
    const board = boardWithCells(10, 20, [
      [3, 5],
      [5, 5],
      [3, 3],
    ]);
    const before = board.snapshot();

    new SrsSpinDetector().detect(board, new ActivePiece("T", { x: 4, y: 4 }), tRotation);

    expect(board.snapshot()).toEqual(before);
  });
});

describe("spin action lock flow", () => {
  it("preserves lastSpinAction through HardDrop and records spin with lineClearCount", () => {
    const random = new SeededRandomProvider(301);
    const board = tSpinBoardNearFloor();
    const state = withPlayer(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), {
      board,
      activePiece: new ActivePiece("T", { x: 4, y: 18 }, "0", tRotation),
      lastSpinAction: tRotation,
    });

    const locked = new HandlePlayerInputUseCase(random).execute(state, "hardDrop");

    expect(locked.combat?.lastSpinResult?.kind).toBe("TSpin");
    expect(locked.events).toContainEqual(expect.objectContaining({ type: "AttackCalculated", lineClearCount: 0 }));
    expect(locked.events).toContainEqual(
      expect.objectContaining({
        type: "SpinDetected",
        spinResult: expect.objectContaining({ kind: "TSpin", grade: "Full", pieceType: "T", method: "TCorner", kickIndex: 0 }),
      }),
    );
  });

  it("clears lastSpinAction after MoveLeft so lock records None", () => {
    const random = new SeededRandomProvider(302);
    const movedState = withPlayer(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), {
      board: Board.create(10, 20),
      activePiece: new ActivePiece("T", { x: 4, y: 4 }, "0", tRotation),
      lastSpinAction: tRotation,
    });

    const moved = new HandlePlayerInputUseCase(random).execute(movedState, "moveLeft");
    const locked = new HandlePlayerInputUseCase(random).execute(moved, "hardDrop");

    expect(moved.combat?.player.lastSpinAction).toBeUndefined();
    expect(locked.combat?.lastSpinResult).toEqual(noSpinResult());
  });

  it("preserves lastSpinAction through gravity before lock", () => {
    const random = new SeededRandomProvider(303);
    const ruleSet = { ...standardRuleSet, gravityMs: 1, lockDelayMs: 1 };
    const state = withPlayer(new StartCombatUseCase(random).execute(new StartRunUseCase().execute()), {
      board: tSpinBoardNearFloor(),
      activePiece: new ActivePiece("T", { x: 4, y: 17 }, "0", tRotation),
      lastSpinAction: tRotation,
    });

    const afterGravity = new TickCombatUseCase(random, ruleSet).execute(state, 1, 0, 10);
    const locked = new TickCombatUseCase(random, ruleSet).execute(afterGravity, 1, 0, 11);

    expect(afterGravity.combat?.player.lastSpinAction).toEqual(tRotation);
    expect(locked.combat?.lastSpinResult?.kind).toBe("TSpin");
  });
});

function spinActionFor(pieceType: TetrominoType): LastSpinAction {
  return {
    pieceType,
    direction: "CW",
    from: "0",
    to: "R",
    usedKickIndex: 0,
    usedKickOffset: { x: 0, y: 0 },
    success: true,
  };
}

function spinResult(result: SpinResult): SpinResult {
  return result;
}

function tSpinBoardNearFloor(): Board {
  return boardWithCells(10, 20, [
    [3, 17],
    [5, 17],
    [3, 19],
  ]);
}

function boardWithCells(width: number, height: number, filled: Array<[number, number]>): Board {
  const cells: Cell[][] = Array.from({ length: height }, () => Array.from({ length: width }, emptyCell));
  for (const [x, y] of filled) cells[y][x] = { filled: true, pieceType: "Z" };
  return new Board(width, height, cells);
}

function boardAllowingOnlyPiece(width: number, height: number, piece: ActivePiece): Board {
  const allowed = new Set(piece.blocks().map((block) => `${block.x},${block.y}`));
  const cells: Cell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (allowed.has(`${x},${y}`) ? emptyCell() : { filled: true, pieceType: "Z" as const })),
  );
  return new Board(width, height, cells);
}

function withPlayer(
  state: ReturnType<StartCombatUseCase["execute"]>,
  playerPatch: Partial<NonNullable<typeof state.combat>["player"]>,
): ReturnType<StartCombatUseCase["execute"]> {
  if (!state.combat) throw new Error("Expected combat");
  return {
    ...state,
    combat: {
      ...state.combat,
      player: {
        ...state.combat.player,
        ...playerPatch,
      },
    },
  };
}
