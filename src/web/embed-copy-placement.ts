export const placeEmbedCopy = (): void => {
  const host = document.querySelector<HTMLElement>("#embed-code");
  const button = document.querySelector<HTMLButtonElement>("#copy-embed");
  if (!host || !button || host.parentElement?.classList.contains("embed-code-shell")) return;

  const shell = document.createElement("div");
  shell.className = "embed-code-shell";
  host.before(shell);
  shell.append(host, button);
  button.classList.add("embed-copy-button");
};
