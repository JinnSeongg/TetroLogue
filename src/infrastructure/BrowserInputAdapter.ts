import type { PlayerInput } from "../application/GameAppState";

export type BrowserControlInput = PlayerInput | "softDrop";

export class BrowserInputAdapter {
  mapKey(key: string): BrowserControlInput | undefined {
    if (key === "ArrowLeft") return "moveLeft";
    if (key === "ArrowRight") return "moveRight";
    if (key === "ArrowDown") return "softDrop";
    if (key === "ArrowUp" || key.toLowerCase() === "x") return "rotateClockwise";
    if (key === "Control" || key.toLowerCase() === "z") return "rotateCounterClockwise";
    if (key.toLowerCase() === "a") return "rotate180";
    if (key === " ") return "hardDrop";
    if (key === "Shift" || key.toLowerCase() === "c") return "hold";
    return undefined;
  }
}
