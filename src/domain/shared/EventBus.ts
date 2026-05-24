import type { GameEvent } from "./GameEvent";

export type GameEventHandler = (event: GameEvent) => void;

export class EventBus {
  private handlers = new Set<GameEventHandler>();
  private history: GameEvent[] = [];

  subscribe(handler: GameEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  publish(event: GameEvent): void {
    this.history.push(event);
    for (const handler of this.handlers) handler(event);
  }

  getHistory(): GameEvent[] {
    return [...this.history];
  }
}
