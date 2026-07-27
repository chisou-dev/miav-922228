export type InputBindings = {
  onAction?: () => void;
};

/** Keyboard / pointer input scaffold for canvas games. */
export class Input {
  constructor(private readonly bindings: InputBindings = {}) {}

  attach(_target: Window | HTMLElement = window) {
    void _target;
    void this.bindings;
  }

  detach() {}
}
