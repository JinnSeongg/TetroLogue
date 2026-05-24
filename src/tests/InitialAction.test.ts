import { describe, expect, it } from "vitest";
import { InitialActionApplier } from "../application/InitialActionApplier";
import { initialActionFromInputState, type InitialActionState } from "../application/input/InitialActionState";
import { createInputState, setHoldPressed, setRotatePressed } from "../application/input/InputState";
import { LockActivePieceUseCase } from "../application/LockActivePieceUseCase";
import { HandlePlayerInputUseCase } from "../application/HandlePlayerInputUseCase";
import { ProcessBufferedInputUseCase } from "../application/ProcessBufferedInputUseCase";
import { createInputBuffer, enqueueInput } from "../application/input/InputBuffer";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import type { GameAppState } from "../application/GameAppState";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import { Board } from "../domain/tetris/Board";
import type { TetrominoType } from "../domain/tetris/Cell";
import type { Cell } from "../domain/tetris/Cell";
import { HoldSlot } from "../domain/tetris/HoldSlot";
import { standardRuleSet } from "../domain/tetris/TetrisRuleSet";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";

describe("IRS and IHS", () => {
  it.each([
    ["CW", "R"],
    ["CCW", "L"],
    ["R180", "2"],
  ] as const)("applies %s IRS when a new piece spawns", (rotationRequested, expectedRotation) => {
    const result = applyInitial({ rotationRequested }, "T");

    expect(result.activePiece.rotation).toBe(expectedRotation);
    expect(result.lastSpinAction).toMatchObject({ pieceType: "T", success: true });
  });

  it("prioritizes Rotate180 and otherwise uses the latest pressed rotation key", () => {
    const afterCw = setRotatePressed(createInputState(), "CW", true);
    const afterCcw = setRotatePressed(afterCw, "CCW", true);
    const after180 = setRotatePressed(afterCcw, "R180", true);

    expect(initialActionFromInputState(afterCcw).rotationRequested).toBe("CCW");
    expect(initialActionFromInputState(after180).rotationRequested).toBe("R180");
  });

  it("applies IHS when hold is pressed at spawn", () => {
    const result = applyInitial({ holdRequested: true, rotationRequested: "None" }, "T", ["L", "J"]);

    expect(result.hold).toBe("T");
    expect(result.holdSlot.usedThisTurn).toBe(true);
    expect(result.activePiece.type).toBe("L");
    expect(result.consumedInputs).toEqual(["hold"]);
  });

  it("applies IHS before IRS so rotation affects the final active piece", () => {
    const result = applyInitial({ holdRequested: true, rotationRequested: "CW" }, "T", ["S", "Z"], new HoldSlot("L"));

    expect(result.hold).toBe("T");
    expect(result.activePiece.type).toBe("L");
    expect(result.activePiece.rotation).toBe("R");
    expect(result.lastSpinAction).toMatchObject({ pieceType: "L", success: true });
    expect(result.consumedInputs).toEqual(["hold", "rotateClockwise"]);
  });

  it("does not repeatedly apply IHS when hold is already unavailable", () => {
    const result = applyInitial({ holdRequested: true, rotationRequested: "None" }, "T", ["L"], new HoldSlot("J", true));

    expect(result.hold).toBe("J");
    expect(result.activePiece.type).toBe("T");
    expect(result.consumedInputs).toEqual([]);
  });

  it("uses SRS kicks for IRS when rotation needs a wall kick", () => {
    const piece = new ActivePiece("T", { x: 4, y: 4 }, "0");
    const kicked = piece.withRotation("R").move(-1, 0);
    const board = boardAllowingOnlyPiece(10, 20, kicked);
    const result = new InitialActionApplier(new SeededRandomProvider(10), standardRuleSet).apply({
      board,
      activePiece: piece,
      holdSlot: new HoldSlot(),
      pieceQueue: ["J", "S"],
      initialAction: { holdRequested: false, rotationRequested: "CW" },
    });

    expect(result.activePiece.rotation).toBe("R");
    expect(result.activePiece.lastRotation?.usedKickIndex).toBe(1);
  });

  it("leaves the piece unchanged and does not update lastSpinAction when IRS fails", () => {
    const board = filledBoard(10, 20);
    const piece = new ActivePiece("T", { x: 4, y: 4 });
    const result = new InitialActionApplier(new SeededRandomProvider(11), standardRuleSet).apply({
      board,
      activePiece: piece,
      holdSlot: new HoldSlot(),
      pieceQueue: ["J", "S"],
      initialAction: { holdRequested: false, rotationRequested: "CW" },
    });

    expect(result.activePiece.position).toEqual(piece.position);
    expect(result.activePiece.rotation).toBe(piece.rotation);
    expect(result.lastSpinAction).toBeUndefined();
    expect(result.consumedInputs).toEqual([]);
  });

  it("consumes matching buffered hold and rotate so the same spawn is not processed twice", () => {
    const random = new SeededRandomProvider(12);
    const state = {
      ...combatState(random, {
        board: Board.create(10, 20),
        activePiece: new ActivePiece("I", { x: 4, y: 19 }),
        pieceQueue: ["T", "L", "J"],
        inputBuffer: enqueueInput(enqueueInput(createInputBuffer(), "hold", 0), "rotateClockwise", 1),
      }),
    };

    const locked = new LockActivePieceUseCase(random).execute(state, state.combat?.player.activePiece, {
      holdRequested: true,
      rotationRequested: "CW",
    });
    const processed = new ProcessBufferedInputUseCase(random).execute(locked, 2);

    expect(locked.inputBuffer?.entries).toEqual([]);
    expect(processed.combat?.player.activePiece?.rotation).toBe(locked.combat?.player.activePiece?.rotation);
    expect(processed.combat?.player.holdSlot.usedThisTurn).toBe(true);
  });

  it("keeps IRS lastSpinAction through immediate hardDrop and clears it after MoveLeft", () => {
    const random = new SeededRandomProvider(13);
    const locked = new LockActivePieceUseCase(random).execute(
      combatState(random, { activePiece: new ActivePiece("I", { x: 4, y: 19 }), pieceQueue: ["T", "L"] }),
      undefined,
      { holdRequested: false, rotationRequested: "CW" },
    );

    expect(locked.combat?.player.lastSpinAction).toMatchObject({ pieceType: "T", success: true });
    const moved = new HandlePlayerInputUseCase(random).execute(locked, "moveLeft");
    expect(moved.combat?.player.lastSpinAction).toBeUndefined();
  });

  it("does not let held horizontal keys affect IRS or IHS", () => {
    let inputState = createInputState();
    inputState = { ...inputState, leftPressed: true, leftPressedAt: 0 };
    inputState = setRotatePressed(inputState, "CW", true);

    const result = applyInitial(initialActionFromInputState(inputState), "T");

    expect(result.activePiece.rotation).toBe("R");
  });
});

function applyInitial(initialAction: Partial<InitialActionState>, activeType: TetrominoType, queue: TetrominoType[] = ["I", "O"], holdSlot = new HoldSlot()) {
  return new InitialActionApplier(new SeededRandomProvider(1), standardRuleSet).apply({
    board: Board.create(10, 20),
    activePiece: new ActivePiece(activeType, { x: 4, y: 0 }),
    holdSlot,
    pieceQueue: queue,
    initialAction: { holdRequested: false, rotationRequested: "None", ...initialAction },
  });
}

function combatState(
  random: SeededRandomProvider,
  patch: Partial<NonNullable<GameAppState["combat"]>["player"]> & { inputBuffer?: GameAppState["inputBuffer"] },
): GameAppState {
  const state = new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
  if (!state.combat) throw new Error("Expected combat");
  const { inputBuffer, ...playerPatch } = patch;
  return {
    ...state,
    inputBuffer,
    combat: {
      ...state.combat,
      player: {
        ...state.combat.player,
        board: Board.create(10, 20),
        ...playerPatch,
      },
    },
  };
}

function boardAllowingOnlyPiece(width: number, height: number, piece: ActivePiece): Board {
  const allowed = new Set(piece.blocks().map((block) => `${block.x},${block.y}`));
  const cells: Cell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (allowed.has(`${x},${y}`) ? { filled: false } : { filled: true, pieceType: "Z" as const })),
  );
  return new Board(width, height, cells);
}

function filledBoard(width: number, height: number): Board {
  const cells: Cell[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => ({ filled: true, pieceType: "Z" as const })));
  return new Board(width, height, cells);
}
