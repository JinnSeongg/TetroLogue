import type { TetrominoType } from "./Cell";
import type { Point } from "./Tetromino";
import { tetrominoShapes } from "./Tetromino";
import type { LastRotation } from "./rotation/RotationAttemptResult";
import { normalizeRotationState, rotationStateToQuarterTurns, type RotationState } from "./rotation/RotationState";

export class ActivePiece {
  constructor(
    public readonly type: TetrominoType,
    public readonly position: Point,
    public readonly rotation: RotationState = "0",
    public readonly lastRotation?: LastRotation,
  ) {}

  blocks(): Point[] {
    return this.localBlocks().map((block) => ({
      x: block.x + this.position.x,
      y: block.y + this.position.y,
    }));
  }

  localBlocks(): Point[] {
    return tetrominoShapes[this.type].map((block) => rotate(this.type, block, this.rotation));
  }

  move(dx: number, dy: number): ActivePiece {
    return new ActivePiece(this.type, { x: this.position.x + dx, y: this.position.y + dy }, this.rotation, this.lastRotation);
  }

  withRotation(rotation: RotationState, lastRotation?: LastRotation): ActivePiece {
    return new ActivePiece(this.type, this.position, rotation, lastRotation);
  }

  withPosition(position: Point, lastRotation = this.lastRotation): ActivePiece {
    return new ActivePiece(this.type, position, this.rotation, lastRotation);
  }

  rotateClockwise(): ActivePiece {
    const states: RotationState[] = ["0", "R", "2", "L"];
    const index = states.indexOf(normalizeRotationState(this.rotation));
    return this.withRotation(states[(index + 1) % 4]);
  }

  rotateCounterClockwise(): ActivePiece {
    const states: RotationState[] = ["0", "R", "2", "L"];
    const index = states.indexOf(normalizeRotationState(this.rotation));
    return this.withRotation(states[(index + 3) % 4]);
  }

  rotate180(): ActivePiece {
    const states: RotationState[] = ["0", "R", "2", "L"];
    const index = states.indexOf(normalizeRotationState(this.rotation));
    return this.withRotation(states[(index + 2) % 4]);
  }
}

function rotate(type: TetrominoType, point: Point, rotation: RotationState): Point {
  if (type === "O") return point;
  const turns = rotationStateToQuarterTurns(rotation);
  if (turns === 0) return point;
  if (turns === 1) return { x: -point.y, y: point.x };
  if (turns === 2) return { x: -point.x, y: -point.y };
  return { x: point.y, y: -point.x };
}
