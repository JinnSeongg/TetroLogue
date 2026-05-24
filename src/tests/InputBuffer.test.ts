import { describe, expect, it } from "vitest";
import type { GameAppState, PlayerInput } from "../application/GameAppState";
import { GameFlowController } from "../application/GameFlowController";
import { ProcessBufferedInputUseCase } from "../application/ProcessBufferedInputUseCase";
import { createInputBuffer, enqueueInput, type InputBuffer } from "../application/input/InputBuffer";
import { StartCombatUseCase } from "../application/StartCombatUseCase";
import { StartRunUseCase } from "../application/StartRunUseCase";
import { Board } from "../domain/tetris/Board";
import { ActivePiece } from "../domain/tetris/ActivePiece";
import { emptyCell, type Cell } from "../domain/tetris/Cell";
import { SeededRandomProvider } from "../infrastructure/SeededRandomProvider";
import type { SaveRunRepository } from "../application/ports/SaveRunRepository";
import { BrowserKeyboardStateAdapter } from "../infrastructure/BrowserKeyboardStateAdapter";
import { createInputState } from "../application/input/InputState";

class MemorySaveRepository implements SaveRunRepository {
  load(): GameAppState | undefined {
    return undefined;
  }

  save(): void {}
}

const startCombatState = (seed = 100): GameAppState => {
  const random = new SeededRandomProvider(seed);
  return new StartCombatUseCase(random).execute(new StartRunUseCase().execute());
};

const withActivePiece = (state: GameAppState, piece: ActivePiece, board: Board): GameAppState => {
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

const boardThatBlocksOnlyRotation = (piece: ActivePiece): Board => {
  const width = 10;
  const height = 20;
  const activeCells = new Set(piece.blocks().map((block) => `${block.x},${block.y}`));
  const cells: Cell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (activeCells.has(`${x},${y}`) ? emptyCell() : { filled: true, pieceType: "O" as const })),
  );
  return new Board(width, height, cells);
};

describe("InputBuffer", () => {
  it("executes a failed rotate input if it becomes possible within bufferMs", () => {
    const random = new SeededRandomProvider(101);
    const piece = new ActivePiece("T", { x: 4, y: 4 });
    const blocked = withActivePiece(startCombatState(101), piece, boardThatBlocksOnlyRotation(piece));
    const controller = new GameFlowController(random, new MemorySaveRepository());

    const buffered = controller.handleInput(blocked, "rotateClockwise", 10, true);
    const unblocked = withActivePiece(buffered, piece, Board.create(10, 20));
    const processed = new ProcessBufferedInputUseCase(random).execute(unblocked, 80);

    expect(buffered.inputBuffer?.entries.map((entry) => entry.command)).toEqual(["rotateClockwise"]);
    expect(processed.combat?.player.activePiece?.rotation).toBe("R");
    expect(processed.inputBuffer?.entries).toEqual([]);
  });

  it("prunes buffered input after bufferMs expires", () => {
    const random = new SeededRandomProvider(102);
    const piece = new ActivePiece("T", { x: 4, y: 4 });
    const state = withActivePiece(startCombatState(102), piece, Board.create(10, 20));
    const buffered = { ...state, inputBuffer: enqueueInput(createInputBuffer(100), "rotateClockwise", 0) };

    const processed = new ProcessBufferedInputUseCase(random).execute(buffered, 101);

    expect(processed.combat?.player.activePiece?.rotation).toBe("0");
    expect(processed.inputBuffer?.entries).toEqual([]);
  });

  it("processes hardDrop before lower priority buffered inputs", () => {
    const random = new SeededRandomProvider(103);
    const state = {
      ...startCombatState(103),
      inputBuffer: ["moveLeft", "rotateClockwise", "hardDrop"].reduce(
        (buffer, command, index) => enqueueInput(buffer, command as PlayerInput, index),
        createInputBuffer(),
      ),
    };

    const processed = new ProcessBufferedInputUseCase(random).execute(state, 20);

    expect(processed.events.some((event) => event.type === "PiecePlaced")).toBe(true);
    expect(processed.inputBuffer?.entries.some((entry) => entry.command === "hardDrop")).toBe(false);
  });

  it("does not buffer softDrop because it is state input", () => {
    const result = new BrowserKeyboardStateAdapter().apply(createInputState(), { type: "keydown", key: "ArrowDown" }, 0);

    expect(result.immediateInput).toBeUndefined();
    expect(result.inputState.softDropPressed).toBe(true);
  });

  it("caps buffered entries to maxBufferSize", () => {
    const buffer = Array.from({ length: 12 }).reduce<InputBuffer>(
      (current, _, index) => enqueueInput(current, "moveLeft", index),
      createInputBuffer(),
    );

    expect(buffer.entries).toHaveLength(5);
    expect(buffer.entries[0].timestampMs).toBe(7);
  });

  it("does not buffer active-piece inputs when no activePiece exists", () => {
    const state = startCombatState(104);
    if (!state.combat) throw new Error("Expected combat");
    const noActivePiece = { ...state, combat: { ...state.combat, player: { ...state.combat.player, activePiece: undefined } } };
    const controller = new GameFlowController(new SeededRandomProvider(104), new MemorySaveRepository());

    const next = controller.handleInput(noActivePiece, "rotateClockwise", 10, true);

    expect(next.inputBuffer?.entries ?? []).toEqual([]);
  });

  it("removes executed input from the buffer", () => {
    const random = new SeededRandomProvider(105);
    const state = {
      ...startCombatState(105),
      inputBuffer: enqueueInput(createInputBuffer(), "moveRight", 0),
    };

    const processed = new ProcessBufferedInputUseCase(random).execute(state, 10);

    expect(processed.inputBuffer?.entries).toEqual([]);
  });

  it("can execute buffered rotate during lock delay", () => {
    const random = new SeededRandomProvider(106);
    const state = startCombatState(106);
    if (!state.combat?.player.activePiece) throw new Error("Expected active piece");
    let grounded = state.combat.player.activePiece;
    while (state.combat.player.board.canPlace(grounded.move(0, 1))) grounded = grounded.move(0, 1);
    const groundedState = {
      ...withActivePiece(state, grounded, state.combat.player.board),
      inputBuffer: enqueueInput(createInputBuffer(), "rotateClockwise", 0),
    };

    const processed = new ProcessBufferedInputUseCase(random).execute(groundedState, 10);

    expect(processed.combat?.player.activePiece?.rotation).toBe("R");
    expect(processed.combat?.player.lockElapsedMs).toBe(0);
  });
});
