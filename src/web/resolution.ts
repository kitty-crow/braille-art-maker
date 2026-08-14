const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));

export interface ResolutionGate {
  readonly value: number;
  readonly resistancePx?: number;
  readonly message: string;
}

export interface ResolutionGateOpts {
  readonly notch?: number;
  readonly resistancePx?: number;
  readonly message?: string;
  readonly gates?: readonly ResolutionGate[];
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
  const gates = [...(opts.gates ?? [
    {
      value: notch,
      resistancePx: resistance,
      message: opts.message ?? "Resolutions above 256 cells are experimental and performance drops significantly. Keep dragging to continue.",
    },
    {
      value: 765,
      resistancePx: resistance,
      message: "Beyond here, any-nyan ventures at their own risk. Extreme resolutions can devour memory, battery, and occasionally the tab itself.",
    },
  ])].sort((a, b) => a.value - b.value);
  const min = Number(input.min);
  const max = Number(input.max);
  let pointer: number | null = null;
  let pointerX = 0;
  let pointerY = 0;
  let committed = Number(input.value);
  let passed = gates.filter(gate => committed > gate.value).length;
  let active: { readonly gate: ResolutionGate; readonly index: number; readonly x: number } | null = null;

  const placeTip = (x: number, y: number): void => {
    const pad = 12;
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    tip.style.left = `${clamp(x + pad, 8, window.innerWidth - width - 8)}px`;
    tip.style.top = `${clamp(y + pad, 8, window.innerHeight - height - 8)}px`;
  };

  const showTip = (message: string): void => {
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

  const normalise = (value: number): number => Math.round(clamp(value, min, max));
  const notchX = (): number => active?.x ?? pointerX;

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

  const syncPassed = (value: number): void => {
    passed = gates.filter(gate => value > gate.value).length;
  };

  const nextGate = (desired: number): { gate: ResolutionGate; index: number } | null => {
    for (let index = passed; index < gates.length; index += 1) {
      const gate = gates[index]!;
      if (desired > gate.value) return { gate, index };
      break;
    }
    return null;
  };

  const catchGate = (desired: number, x: number): boolean => {
    const next = nextGate(desired);
    if (!next) return false;
    active = { ...next, x };
    setValue(next.gate.value);
    showTip(next.gate.message);
    return true;
  };

  const commitManual = (): void => {
    const requested = Number(valueInput.value);
    const next = Number.isFinite(requested) ? normalise(requested) : Number(input.value);
    setValue(next);
    syncPassed(next);
    active = null;
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
    syncPassed(Number(input.value));
    active = null;
  });

  input.addEventListener("pointermove", event => {
    if (pointer !== event.pointerId) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    const desired = valueAt(event.clientX);

    if (active) {
      if (desired <= active.gate.value) {
        active = null;
        syncPassed(desired);
        hideTip();
        return;
      }

      if (event.clientX < notchX() + resistance) {
        setValue(active.gate.value);
        showTip(active.gate.message);
        return;
      }

      passed = Math.max(passed, active.index + 1);
      active = null;
      hideTip();
      if (catchGate(desired, event.clientX)) return;
      setValue(desired);
      return;
    }

    catchGate(desired, event.clientX);
  });

  input.addEventListener("input", () => {
    const requested = Number(input.value);
    if (pointer !== null && active && requested > active.gate.value) {
      input.value = String(active.gate.value);
      valueInput.value = input.value;
      showTip(active.gate.message);
      return;
    }
    valueInput.value = input.value;
  });

  input.addEventListener("change", commit);

  valueInput.addEventListener("input", () => {
    if (!valueInput.value.trim()) return;
    const requested = Number(valueInput.value);
    if (!Number.isFinite(requested) || requested < min || requested > max) return;
    const next = normalise(requested);
    input.value = String(next);
    syncPassed(next);
    active = null;
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
    syncPassed(Number(input.value));
    active = null;
    hideTip();
    commit();
  };
  input.addEventListener("pointerup", finish);
  input.addEventListener("pointercancel", finish);
  input.addEventListener("lostpointercapture", finish);
};
