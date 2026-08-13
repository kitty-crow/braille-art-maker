import { definePages } from "__TEMPLATE__/src/index.ts";

export default definePages({
  source: "web",
  out: "site",
  assets: "assets/pages",
  pages: [
    { from: "index.html", route: "/" },
    { from: "about.html", route: "/about/", legacy: ["about.html"] },
    { from: "readme.html", route: "/readme/", legacy: ["readme.html"] },
    { from: "404.html", route: "/404.html", keepSource: true }
  ],
  copy: [
    { from: "version.json", to: "version.json" }
  ],
  css: {
    files: [
      "tokens.css",
      "base.css",
      "type.css",
      "shell.css",
      "nav.css",
      "theme.css",
      "panel.css",
      "field.css",
      "button.css",
      "footer.css",
      "kofi.css",
      "markdown.css",
      "util.css",
      "responsive.css"
    ]
  },
  runtime: {
    base: "__BASE__",
    theme: {
      key: "__THEME_KEY__",
      colours: {
        light: "#f5f6f8",
        dark: "#11131a"
      }
    },__KOFI__
    version: {
      file: "version.json"
    },
    readme: {
      owner: "__OWNER__",
      repo: "__REPO_NAME__"
    }
  }
});
