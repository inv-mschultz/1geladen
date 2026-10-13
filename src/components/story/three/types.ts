export type Pointer = { x: number; y: number }

export type SceneInstance = {
  /** Draws one frame for chapter progress `p` (0–1) at time `t` in seconds. */
  render: (p: number, t: number, pointer: Pointer) => void
  resize: (width: number, height: number) => void
  dispose: () => void
}

export type SceneModule = {
  /** May load models first, so it can resolve later. */
  create: (canvas: HTMLCanvasElement, text: Record<string, string>) => SceneInstance | Promise<SceneInstance>
}
