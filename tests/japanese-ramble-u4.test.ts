import { expect, test } from "bun:test";
import { encodeU4, encodeU4J } from "../src/embed/codec.ts";
import { j8192EntropyValues } from "../src/jp/j8192-entropy.ts";

const sample = Uint8Array.from({ length: 97 }, (_, i) => (i * 73 + 19) & 0xff);

test("J8192 ramble entropy is transport-independent for the same u4 bytes", () => {
  const base91 = encodeU4("r", sample);
  const j8192 = encodeU4J("r", sample);
  expect(j8192EntropyValues(base91)).toEqual(j8192EntropyValues(j8192));
});

test("J8192 ramble entropy preserves 13-bit range", () => {
  const values = j8192EntropyValues(encodeU4J("r", sample));
  expect(values.length).toBeGreaterThan(0);
  expect(values.every(value => value >= 0 && value < 8192)).toBe(true);
});
