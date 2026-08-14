const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));

export interface ResolutionGateOpts {
  readonly notch?: number;
  readonly resistancePx?: number;
  readonly message?: string;
}

export const bindResolutionGate = (
  input: HTMLInputElement,
  valueInput: HTMLInputElement,
  tip: HTMLElement,
  onCommit: () => void,
  opts: ResolutionGateOpts = {},
): void => {
  const notch = opts.notch ?? 256;
  const resistance = opts.resistancePx ?? 34;
  const message = opts.message ?? "Resolutions above 256 cells are experimental and performance drops significantly. Keep dragging to continue.";
  const min = Number(input.min);
  const max = Number(input.max);
  let pointer: number | null = null;
  let released = Number(input.value) > notch;
  let gateX: number | null = null;
  let pointerX = 0;
  let pointerY = 0;
  let committed = Number(input.value);

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
    const ratio = clamp((x - rect.left) / Math.max(1, rect.width), 0, 1);
    return Math.round(min + ratio * (max - min));
  };

  const notchX = (): number => gateX ?? pointerX;
  const normalise = (value: number): number => Math.round(clamp(value, min, max));

  // Resolution movement is intentionally cheap: keep the range and numerical control in
  // sync, but do not regenerate the art until the user finishes the interaction.
  const setValue = (value: number): boolean => {
    const next = String(normalise(value));
    const changed = input.value !== next;
    input.value = next;
    valueInput.value = next;
    return changed;
  };

  const commit = (): void => {
    const next = Number(input.value);
    if (next === committed) return;
    committed = next;
    onCommit();
  };

  const commitManual = (): void => {
    const requested = Number(valueInput.value);
    const next = Number.isFinite(requested) ? normalise(requested) : Number(input.value);
    setValue(next);
    released = next > notch;
    gateX = null;
    hideTip();
    commit();
  };

  input.addEventListener("focus", () => { committed = Number(input.value); });
  valueInput.addEventListener("focus", () => { committed = Number(input.value); });

  input.addEventListener("pointerdown", event => {
    pointer = event.pointerId;
    pointerX = event.clientX;
    pointerY = event.clientY;
    committed = Number(input.value);
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
      valueInput.value = input.value;
      showTip();
      return;
    }
    valueInput.value = input.value;
  });

  // Range inputs emit change when the interaction is committed (pointer release / keyboard
  // adjustment). Pointer finish below is retained as a fallback for engines with odd range
  // event ordering; the committed-value guard prevents duplicate regeneration.
  input.addEventListener("change", commit);

  valueInput.addEventListener("input", () => {
    if (!valueInput.value.trim()) return;
    const requested = Number(valueInput.value);
    if (!Number.isFinite(requested) || requested < min || requested > max) return;
    const next = normalise(requested);
    input.value = String(next);
    released = next > notch;
    gateX = null;
    hideTip();
  });
  valueInput.addEventListener("change", commitManual);
  valueInput.addEventListener("blur", commitManual);
  valueInput.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    commitManual();
    valueInput.blur();
  });

  const finish = (event: PointerEvent): void => {
    if (pointer !== event.pointerId) return;
    pointer = null;
    released = Number(input.value) > notch;
    gateX = null;
    hideTip();
    commit();
  };
  input.addEventListener("pointerup", finish);
  input.addEventListener("pointercancel", finish);
  input.addEventListener("lostpointercapture", finish);
};
