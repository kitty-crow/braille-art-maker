import { definePages } from "./vendor/pages/src/index.ts";

export default definePages({
  source: "web",
  out: "site",
  assets: "assets/pages",
  copy: [{ from: "version.json", to: "version.json" }],
  pages: [
    { from: "index.html", route: "/" },
    { from: "about/index.html", route: "/about/" },
    { from: "readme/index.html", route: "/readme/" },
    { from: "404.html", route: "/404.html" }
  ],
  css: {
    files: ["kofi.css"]
  },
  runtime: {
    base: "/unicode-art-studio/",
    theme: {
      key: "unicode-art-studio.theme",
      colours: { light: "#f7f3f1", dark: "#111016" },
      toggle: "[data-theme-toggle]",
      label: "[data-theme-label]",
      event: "unicode-art-theme"
    },
    kofi: {
      user: "kittycrow",
      header: ".site-header",
      footer: ".footer__links",
      footerText: "Buy me a coffee",
      separator: " · ",
      desktopText: "Buy me a coffee?",
      background: "#5bc0de",
      text: "#323842",
      wideAt: 721
    },
    version: {
      file: "version.json",
      selector: "[data-version]",
      prefix: "v",
      fallback: "v?"
    },
    readme: {
      owner: "kitty-crow",
      repo: "unicode-art-studio",
      branch: "main",
      path: "README.md",
      content: "#readme-content",
      status: "#readme-status"
    }
  }
});
