export type FrameHandler = (deltaMs: number) => void;

export class GameLoop {
  private frameId?: number;
  private lastTime?: number;

  start(handler: FrameHandler): void {
    const tick = (time: number) => {
      const delta = this.lastTime === undefined ? 0 : time - this.lastTime;
      this.lastTime = time;
      handler(delta);
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
  }
}
