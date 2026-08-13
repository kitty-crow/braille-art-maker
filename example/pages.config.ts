import { definePages } from "../src/index.ts";

export default definePages({
  source: "web",
  out: "site",
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
      "button.css",
      "footer.css",
      "markdown.css",
      "util.css",
      "responsive.css"
    ],
    vars: {
      "--pages-accent": "#5263d9"
    },
    dark: {
      "--pages-accent": "#9ba5ff"
    }
  },
  runtime: {
    base: "/",
    theme: {
      key: "pages-example.theme",
      colours: {
        light: "#f5f6f8",
        dark: "#11131a"
      }
    },
    version: {
      file: "version.json"
    },
    readme: {
      owner: "kitty-crow",
      repo: "github-pages-template"
    }
  }
});
