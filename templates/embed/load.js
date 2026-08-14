(() => {
  const script = document.currentScript;
  const host = script?.parentElement;

  if (!(script instanceof HTMLScriptElement) || !(host instanceof HTMLElement)) return;

  const src = script.dataset.api || new URL("embed.js", script.src).href;
  const key = "__unicodeArtLoad";
  const win = window;
  const ready = win.UnicodeArt
    ? Promise.resolve(win.UnicodeArt)
    : win[key] ??= new Promise((resolve, reject) => {
        const api = document.createElement("script");
        api.src = src;
        api.async = true;
        api.onload = () => win.UnicodeArt
          ? resolve(win.UnicodeArt)
          : reject(new Error("Unicode Art API did not initialise."));
        api.onerror = () => reject(new Error(`Could not load Unicode Art API: ${src}`));
        document.head.append(api);
      });

  ready.then(api => api.mount(host)).catch(err => {
    host.textContent = err instanceof Error ? err.message : String(err);
  });
})();
