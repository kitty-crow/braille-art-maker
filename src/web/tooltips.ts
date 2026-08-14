const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));

export const bindTooltips = (root: ParentNode = document): void => {
  const tip = root.querySelector<HTMLElement>("#slider-tip");
  if (!tip) return;

  const place = (x: number, y: number): void => {
    const pad = 12;
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    tip.style.left = `${clamp(x + pad, 8, window.innerWidth - width - 8)}px`;
    tip.style.top = `${clamp(y + pad, 8, window.innerHeight - height - 8)}px`;
  };

  const show = (button: HTMLElement, x?: number, y?: number): void => {
    tip.textContent = button.dataset.tip ?? "";
    tip.hidden = false;
    if (x !== undefined && y !== undefined) place(x, y);
    else {
      const rect = button.getBoundingClientRect();
      place(rect.right, rect.top + rect.height / 2);
    }
  };

  const hide = (): void => { tip.hidden = true; };

  for (const button of root.querySelectorAll<HTMLElement>(".slider-info")) {
    button.addEventListener("pointerenter", event => show(button, event.clientX, event.clientY));
    button.addEventListener("pointermove", event => place(event.clientX, event.clientY));
    button.addEventListener("pointerleave", hide);
    button.addEventListener("focus", () => show(button));
    button.addEventListener("blur", hide);
    button.addEventListener("keydown", event => { if (event.key === "Escape") { hide(); button.blur(); } });
  }
};
