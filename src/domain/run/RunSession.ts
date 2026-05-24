import type { RunState } from "./RunState";

export class RunSession {
  constructor(public readonly state: RunState) {}
}
