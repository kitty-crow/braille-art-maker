const svgNs = "http://www.w3.org/2000/svg";

const svg = (done: boolean): SVGSVGElement => {
  const icon = document.createElementNS(svgNs, "svg");
  icon.setAttribute("viewBox", "0 0 20 20");
  icon.setAttribute("aria-hidden", "true");
  if (done) {
    const path = document.createElementNS(svgNs, "path");
    path.setAttribute("d", "M4.5 10.4 8.1 14l7.4-8");
    icon.append(path);
    return icon;
  }
  const back = document.createElementNS(svgNs, "rect");
  back.setAttribute("x", "3.5");
  back.setAttribute("y", "3.5");
  back.setAttribute("width", "9");
  back.setAttribute("height", "9");
  back.setAttribute("rx", "1.8");
  const front = document.createElementNS(svgNs, "rect");
  front.setAttribute("x", "7.5");
  front.setAttribute("y", "7.5");
  front.setAttribute("width", "9");
  front.setAttribute("height", "9");
  front.setAttribute("rx", "1.8");
  icon.append(back, front);
  return icon;
};

export const bindEmbedCopy = (): void => {
  const button = document.querySelector<HTMLButtonElement>("#copy-embed");
  const host = document.querySelector<HTMLElement>("#embed-code");
  if (!button || !host || button.dataset.iconCopy === "true") return;

  const shell = document.createElement("div");
  shell.className = "embed-code-shell";
  host.before(shell);
  shell.append(host, button);
  button.className = "embed-copy-button";
  button.dataset.iconCopy = "true";

  let observer: MutationObserver;
  const paint = (done: boolean): void => {
    observer?.disconnect();
    button.replaceChildren(svg(done));
    button.dataset.copyState = done ? "done" : "ready";
    const label = done ? "Copied" : "Copy selected embed";
    button.setAttribute("aria-label", label);
    button.title = label;
    observer?.observe(button, { childList: true, characterData: true, subtree: true });
  };

  observer = new MutationObserver(() => {
    const text = button.textContent?.trim() ?? "";
    paint(/^Copied\b/u.test(text));
  });
  paint(false);
};
