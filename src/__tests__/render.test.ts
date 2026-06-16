import assert from "node:assert/strict";
import test from "node:test";
import { createEmptySpec } from "../schema.js";
import { renderSpecMarkdown } from "../render.js";

test("renderSpecMarkdown includes the developer-facing technical sections", () => {
  const markdown = renderSpecMarkdown(
    createEmptySpec({ brand: "Acme", product: "Smart Driver", model: "DALI-2" }, "2026-06-16T00:00:00.000Z"),
  );

  assert.match(markdown, /## Hardware Parameters/);
  assert.match(markdown, /## Electrical Parameters/);
  assert.match(markdown, /## Wireless Communication/);
  assert.match(markdown, /### Bluetooth/);
  assert.match(markdown, /### Zigbee/);
  assert.match(markdown, /### DALI/);
  assert.match(markdown, /Unknown/);
});
