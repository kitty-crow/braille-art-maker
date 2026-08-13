import { expect, test } from "bun:test";
import { href, routeFile } from "../src/path.ts";

test("maps clean routes", () => {
  expect(routeFile("/")).toBe("index.html");
  expect(routeFile("/about/")).toBe("about/index.html");
  expect(routeFile("/404.html")).toBe("404.html");
});

test("resolves generated assets from nested pages", () => {
  expect(href("index.html", "assets/pages/runtime.js")).toBe("./assets/pages/runtime.js");
  expect(href("about/index.html", "assets/pages/runtime.js")).toBe("../assets/pages/runtime.js");
});
