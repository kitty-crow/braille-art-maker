const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));

export interface ResolutionGateOpts {
  readonly notch?: number;
  readonly resistancePx?: number;
  readonly message?: string;
}

export const bindResolutionGate = (
  input: HTMLInputElement,
  output: HTMLOutputElement,
  tip: HTMLElement,
  onInput: () => void,
  opts: ResolutionGateOpts = {},
): void => {
  const notch = opts.notch ?? 256;
  const resistance = opts.resistancePx ?? 34;
  const message = opts.message ?? "Resolutions above 256 cells are experimental. Visual rendering may be flaky and performance can be terrible. Keep dragging to continue.";
  let pointer: number | null = null;
  let released = Number(input.value) > notch;
  let gateX: number | null = null;
  let pointerX = 0;
  let pointerY = 0;

  const placeTip = (x: number, y: number): void => {
    const pad = 12;
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    tip.style.left = `${clamp(x + pad, 8, window.innerWidth - width - 8)}px`;
    tip.style.top = `${clamp(y + pad, 8, window.innerHeight - height - 8)}px`;
  };

  const showTip = (): void => {
    tip.textContent = message;
    tip.hidden = false;
    placeTip(pointerX, pointerY);
  };
  const hideTip = (): void => { tip.hidden = true; };

  const valueAt = (x: number): number => {
    const rect = input.getBoundingClientRect();
    const min = Number(input.min);
    const max = Number(input.max);
    const ratio = clamp((x - rect.left) / Math.max(1, rect.width), 0, 1);
    return Math.round(min + ratio * (max - min));
  };

  const notchX = (): number => gateX ?? pointerX;

  const setValue = (value: number): boolean => {
    const next = String(value);
    if (input.value === next) { output.value = next; return false; }
    input.value = next;
    output.value = next;
    onInput();
    return true;
  };

  input.addEventListener("pointerdown", event => {
    pointer = event.pointerId;
    pointerX = event.clientX;
    pointerY = event.clientY;
    released = Number(input.value) > notch;
    gateX = null;
  });

  input.addEventListener("pointermove", event => {
    if (pointer !== event.pointerId) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (released) return;

    const desired = valueAt(event.clientX);
    if (desired <= notch) {
      gateX = null;
      hideTip();
      return;
    }

    if (gateX === null) {
      gateX = event.clientX;
      setValue(notch);
      showTip();
      return;
    }

    if (event.clientX < notchX() + resistance) {
      setValue(notch);
      showTip();
      return;
    }

    released = true;
    gateX = null;
    hideTip();
    setValue(desired);
  });

  input.addEventListener("input", () => {
    const requested = Number(input.value);
    if (pointer !== null && !released && requested > notch) {
      input.value = String(notch);
      output.value = input.value;
      showTip();
      onInput();
      return;
    }
    output.value = input.value;
    onInput();
  });

  const finish = (event: PointerEvent): void => {
    if (pointer !== event.pointerId) return;
    pointer = null;
    released = Number(input.value) > notch;
    gateX = null;
    hideTip();
  };
  input.addEventListener("pointerup", finish);
  input.addEventListener("pointercancel", finish);
  input.addEventListener("lostpointercapture", finish);
};
