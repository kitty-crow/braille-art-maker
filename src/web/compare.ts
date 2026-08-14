export const bindCompare = (host: HTMLElement, divider: HTMLElement): void => {
  let pointer: number | null = null;
  const setSplit = (value: number): void => { const pct = Math.max(0, Math.min(100, value)); host.style.setProperty("--split", `${pct}%`); divider.setAttribute("aria-valuenow", String(Math.round(pct))); };
  const setPointer = (x: number): void => { const rect = host.getBoundingClientRect(); setSplit(((x - rect.left) / rect.width) * 100); };
  host.addEventListener("pointerdown", event => { pointer = event.pointerId; host.setPointerCapture(pointer); setPointer(event.clientX); });
  host.addEventListener("pointermove", event => { if (pointer === event.pointerId) setPointer(event.clientX); });
  host.addEventListener("pointerup", event => { if (pointer === event.pointerId) pointer = null; });
  divider.addEventListener("keydown", event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const current = Number(divider.getAttribute("aria-valuenow") ?? 50); const next = event.key === "Home" ? 0 : event.key === "End" ? 100 : current + (event.key === "ArrowLeft" ? -2 : 2); setSplit(next); });
};
