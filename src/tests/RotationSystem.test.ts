import { describe, expect, it } from "vitest";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import { Board } from "../domain/tetris/Board";
import { emptyCell, type Cell, type TetrominoType } from "../domain/tetris/Cell";
import { RotationSystem } from "../domain/tetris/RotationSystem";
import { MovementSystem } from "../domain/tetris/MovementSystem";
import { toBoardOffset } from "../domain/tetris/rotation/KickOffset";
import { Srs180KickTableProvider, srs180IKickTable, srs180JlstzKickTable, srs180OKickTable } from "../domain/tetris/rotation/Srs180KickTables";
import { SrsKickTableProvider, srsIKickTable, srsJlstzKickTable, srsOKickTable } from "../domain/tetris/rotation/SrsKickTables";
import { HandlePlayerInputUseCase } from "../application/HandlePlayerInputUseCase";
import { ProcessBufferedInputUseCase } from "../application/ProcessBufferedInputUseCase";
import { createInputBuffer, enqueueInput } from "../application/input/InputBuffer";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

describe("RotationSystem", () => {
  it("rotates clockwise, counter-clockwise, and 180 degrees in empty space", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("T", { x: 4, y: 4 });
    const rotation = new RotationSystem();

    expect(rotation.tryRotateClockwise(board, piece).rotation).toBe("R");
    expect(rotation.tryRotateCounterClockwise(board, piece).rotation).toBe("L");
    expect(rotation.tryRotate180(board, piece).rotation).toBe("2");
  });

  it("records first successful kick index and original SRS offset", () => {
    const board = boardWithCells(10, 20, [
      [4, 3],
      [4, 4],
      [4, 5],
      [3, 4],
    ]);
    const piece = new ActivePiece("T", { x: 4, y: 4 });

    const result = new RotationSystem().attempt(board, piece, "CW");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.usedKickIndex).toBe(4);
    expect(result.usedKickOffset).toEqual({ x: -1, y: -2 });
    expect(result.piece.lastRotation).toEqual({
      pieceType: "T",
      direction: "CW",
      from: "0",
      to: "R",
      usedKickIndex: 4,
      usedKickOffset: { x: -1, y: -2 },
      success: true,
    });
  });

  it("uses project y-down conversion only when applying SRS kick offsets", () => {
    expect(toBoardOffset({ x: -1, y: 1 })).toEqual({ x: -1, y: -1 });
    expect(toBoardOffset({ x: 0, y: -2 })).toEqual({ x: 0, y: 2 });
  });

  it("kicks near the left wall", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("J", { x: 0, y: 4 }, "R");

    const rotated = new RotationSystem().tryRotateClockwise(board, piece);

    expect(rotated.rotation).toBe("2");
    expect(board.canPlace(rotated)).toBe(true);
  });

  it("kicks near the right wall", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("L", { x: 9, y: 4 }, "L");

    const rotated = new RotationSystem().tryRotateCounterClockwise(board, piece);

    expect(rotated.rotation).toBe("2");
    expect(board.canPlace(rotated)).toBe(true);
  });

  it("uses I-piece wall kicks separately from JLSTZ wall kicks", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("I", { x: 0, y: 5 }, "R");

    const result = new RotationSystem().attempt(board, piece, "CCW");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.usedKickOffset).toEqual({ x: 2, y: 0 });
    expect(result.usedKickOffset).toEqual(srsIKickTable["R>0"]?.[1]);
  });

  it.each(["J", "L", "S", "T", "Z"] as TetrominoType[])("rotates %s after movement flow puts its horizontal face against the left wall", (pieceType) => {
    const board = Board.create(10, 20);
    const piece = moveToWall(board, new ActivePiece(pieceType, { x: 5, y: 0 }, "0"), "left");

    expect(piece.blocks().some((block) => block.x === 0)).toBe(true);
    expect(new RotationSystem().attempt(board, piece, "CW").success).toBe(true);
    expect(new RotationSystem().attempt(board, piece, "CCW").success).toBe(true);
  });

  it.each(["J", "L", "S", "T", "Z"] as TetrominoType[])("rotates %s after movement flow puts its horizontal face against the right wall", (pieceType) => {
    const board = Board.create(10, 20);
    const piece = moveToWall(board, new ActivePiece(pieceType, { x: 5, y: 0 }, "0"), "right");

    expect(piece.blocks().some((block) => block.x === board.width - 1)).toBe(true);
    expect(new RotationSystem().attempt(board, piece, "CW").success).toBe(true);
    expect(new RotationSystem().attempt(board, piece, "CCW").success).toBe(true);
  });

  it("rotates L after movement flow puts its vertical face against the left wall", () => {
    const board = Board.create(10, 20);
    const piece = moveToWall(board, new ActivePiece("L", { x: 5, y: 1 }, "L"), "left");

    const clockwise = new RotationSystem().attempt(board, piece, "CW");
    const counterClockwise = new RotationSystem().attempt(board, piece, "CCW");

    expect(piece.blocks().some((block) => block.x === 0)).toBe(true);
    expect(clockwise.success).toBe(true);
    expect(counterClockwise.success).toBe(true);
    if (!clockwise.success) return;
    expect(board.canPlace(clockwise.piece)).toBe(true);
  });

  it("rotates J after movement flow puts its vertical face against the right wall", () => {
    const board = Board.create(10, 20);
    const piece = moveToWall(board, new ActivePiece("J", { x: 5, y: 1 }, "R"), "right");

    const clockwise = new RotationSystem().attempt(board, piece, "CW");
    const counterClockwise = new RotationSystem().attempt(board, piece, "CCW");

    expect(piece.blocks().some((block) => block.x === board.width - 1)).toBe(true);
    expect(clockwise.success).toBe(true);
    expect(counterClockwise.success).toBe(true);
    if (!counterClockwise.success) return;
    expect(board.canPlace(counterClockwise.piece)).toBe(true);
  });

  it("reports detailed canPlace failures without changing the public canPlace API", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("L", { x: -1, y: 20 });

    expect(board.canPlace(piece)).toBe(false);
    expect(board.canPlaceDetailed(piece).failures.map((failure) => failure.reason)).toContain("outOfBoundsLeft");
    expect(board.canPlaceDetailed(piece).failures.map((failure) => failure.reason)).toContain("outOfBoundsBottom");
  });

  it("allows hidden-top blocks so top-row wall kicks can be tested like live play", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("L", { x: 1, y: 0 }, "R");

    expect(piece.blocks().some((block) => block.y < 0)).toBe(true);
    expect(board.canPlace(piece)).toBe(true);
  });

  it("can rotate near the floor using SRS vertical kicks", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("T", { x: 4, y: 19 }, "L");

    const rotated = new RotationSystem().tryRotateClockwise(board, piece);

    expect(rotated.rotation).toBe("0");
    expect(board.canPlace(rotated)).toBe(true);
  });

  it("uses I-piece specific kick data", () => {
    const board = boardWithCells(10, 20, [
      [0, 4],
      [0, 5],
      [0, 6],
      [0, 7],
    ]);
    const piece = new ActivePiece("I", { x: 0, y: 5 });

    const result = new RotationSystem().attempt(board, piece, "CW");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.usedKickIndex).toBe(2);
    expect(result.usedKickOffset).toEqual({ x: 1, y: 0 });
  });

  it("handles O-piece as an exception with no position kick", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("O", { x: 4, y: 4 });

    const result = new RotationSystem().attempt(board, piece, "CW");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.piece.position).toEqual(piece.position);
    expect(result.usedKickIndex).toBe(0);
    expect(result.usedKickOffset).toEqual({ x: 0, y: 0 });
  });

  it("fails when every candidate collides", () => {
    const board = filledBoard(10, 20);
    const piece = new ActivePiece("T", { x: 4, y: 4 });

    const result = new RotationSystem().attempt(board, piece, "CW");

    expect(result.success).toBe(false);
    expect(result.piece.lastRotation).toEqual({
      pieceType: "T",
      direction: "CW",
      from: "0",
      to: "R",
      success: false,
    });
    expect(result.piece.position).toEqual(piece.position);
    expect(result.piece.rotation).toBe(piece.rotation);
  });

  it.each([
    ["0", "2"],
    ["R", "L"],
    ["2", "0"],
    ["L", "R"],
  ] as const)("supports 180 transition %s>%s", (from, to) => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("T", { x: 4, y: 4 }, from);

    const result = new RotationSystem().attempt(board, piece, "ONE_EIGHTY");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.from).toBe(from);
    expect(result.to).toBe(to);
    expect(result.transition).toBe(`${from}>${to}`);
    expect(result.piece.lastRotation?.direction).toBe("ONE_EIGHTY");
  });

  it.each(["J", "L", "S", "Z"] as const)("uses the shared JLSTZ SRS provider for %s", (pieceType) => {
    expect(new SrsKickTableProvider().getKickTable(pieceType, "CW")).toBe(srsJlstzKickTable);
  });

  it("keeps I and O providers separate from JLSTZ", () => {
    const provider = new SrsKickTableProvider();

    expect(provider.getKickTable("I", "CW")).toBe(srsIKickTable);
    expect(provider.getKickTable("O", "CW")).toBe(srsOKickTable);
    expect(provider.getKickTable("I", "CW")).not.toBe(srsJlstzKickTable);
  });

  it("keeps 180 kick tables separate from 90-degree SRS tables", () => {
    const provider = new Srs180KickTableProvider();

    expect(new SrsKickTableProvider().getKickTable("T", "ONE_EIGHTY")).toEqual({});
    expect(provider.getKickTable("T", "ONE_EIGHTY")).toBe(srs180JlstzKickTable);
    expect(provider.getKickTable("I", "ONE_EIGHTY")).toBe(srs180IKickTable);
    expect(provider.getKickTable("O", "ONE_EIGHTY")).toBe(srs180OKickTable);
    expect(provider.getKickTable("T", "CW")).toEqual({});
  });

  it("uses I-piece 0>R data instead of JLSTZ data", () => {
    const board = boardWithCells(10, 20, [
      [0, 4],
      [0, 5],
      [0, 6],
      [0, 7],
    ]);
    const piece = new ActivePiece("I", { x: 0, y: 5 });

    const result = new RotationSystem().attempt(board, piece, "CW");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.usedKickOffset).toEqual({ x: 1, y: 0 });
    expect(result.usedKickOffset).not.toEqual(srsJlstzKickTable["0>R"]?.[2]);
  });

  it("uses I-piece R>2 data", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("I", { x: 0, y: 5 }, "R");

    const result = new RotationSystem().attempt(board, piece, "CW");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.transition).toBe("R>2");
    expect(result.usedKickOffset).toEqual({ x: 2, y: 0 });
  });

  it("does not move O-piece on 180 rotation", () => {
    const board = Board.create(10, 20);
    const piece = new ActivePiece("O", { x: 4, y: 4 });

    const result = new RotationSystem().attempt(board, piece, "ONE_EIGHTY");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.piece.position).toEqual(piece.position);
    expect(result.usedKickOffset).toEqual({ x: 0, y: 0 });
  });

  it("uses y-down conversion so upward SRS kicks move toward smaller board y", () => {
    const piece = new ActivePiece("T", { x: 5, y: 17 }, "R");
    const expected = piece.withRotation("2").move(0, -2);
    const board = boardAllowingOnlyPiece(10, 20, expected);

    const result = new RotationSystem().attempt(board, piece, "CW");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.usedKickOffset).toEqual({ x: 0, y: 2 });
    expect(result.piece.position.y).toBe(15);
  });

  it("buffered rotateCW uses the same SRS metadata path", () => {
    const random = new SeededRandomProvider(200);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    if (!state.combat) throw new Error("Expected combat");
    const primed = {
      ...state,
      combat: {
        ...state.combat,
        player: {
          ...state.combat.player,
          board: Board.create(10, 20),
          activePiece: new ActivePiece("T", { x: 4, y: 4 }),
        },
      },
      inputBuffer: enqueueInput(createInputBuffer(), "rotateClockwise", 0),
    };

    const processed = new ProcessBufferedInputUseCase(random).execute(primed, 20);

    expect(processed.combat?.player.activePiece?.rotation).toBe("R");
    expect(processed.combat?.player.activePiece?.lastRotation).toMatchObject({ pieceType: "T", direction: "CW", success: true });
  });

  it("buffered rotate180 uses the 180 kick path", () => {
    const random = new SeededRandomProvider(201);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    if (!state.combat) throw new Error("Expected combat");
    const primed = {
      ...state,
      combat: {
        ...state.combat,
        player: {
          ...state.combat.player,
          board: Board.create(10, 20),
          activePiece: new ActivePiece("T", { x: 4, y: 4 }),
        },
      },
      inputBuffer: enqueueInput(createInputBuffer(), "rotate180", 0),
    };

    const processed = new ProcessBufferedInputUseCase(random).execute(primed, 20);

    expect(processed.combat?.player.activePiece?.rotation).toBe("2");
    expect(processed.combat?.player.activePiece?.lastRotation).toMatchObject({ pieceType: "T", direction: "ONE_EIGHTY", success: true });
  });

  it("failed rotation does not reset lock delay", () => {
    const random = new SeededRandomProvider(202);
    const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
    if (!state.combat) throw new Error("Expected combat");
    const piece = new ActivePiece("T", { x: 4, y: 4 });
    const primed = {
      ...state,
      combat: {
        ...state.combat,
        player: {
          ...state.combat.player,
          board: filledBoard(10, 20),
          activePiece: piece,
          lockElapsedMs: 200,
          lockResetCount: 0,
        },
      },
    };

    const result = new HandlePlayerInputUseCase(random).executeWithResult(primed, "rotateClockwise", 50);

    expect(result.executed).toBe(false);
    expect(result.state.events.some((event) => event.type === "PlayerActionSucceeded")).toBe(false);
    expect(result.state.combat?.player.lockElapsedMs).toBe(200);
    expect(result.state.combat?.player.lockResetCount).toBe(0);
  });
});

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

function moveToWall(board: Board, piece: ActivePiece, side: "left" | "right"): ActivePiece {
  const movement = new MovementSystem();
  const dx = side === "left" ? -1 : 1;
  let current = piece;
  let next = movement.tryMove(board, current, dx, 0);
  while (next !== current) {
    current = next;
    next = movement.tryMove(board, current, dx, 0);
  }
  return current;
}

function filledBoard(width: number, height: number): Board {
  const cells: Cell[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => ({ filled: true, pieceType: "Z" as const })));
  return new Board(width, height, cells);
}
