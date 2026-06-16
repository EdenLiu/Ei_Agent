import assert from "node:assert/strict";
import test from "node:test";
import { createEmptySpec, normalizeSpec, UNKNOWN_VALUE } from "../schema.js";

test("createEmptySpec marks missing required parameters as Unknown", () => {
  const spec = createEmptySpec({ brand: "Acme", product: "Smart Driver" }, "2026-06-16T00:00:00.000Z");

  assert.equal(spec.hardware.find((item) => item.name === "MCU/SoC")?.value, UNKNOWN_VALUE);
  assert.equal(spec.electrical.find((item) => item.name === "Input voltage")?.status, "unknown");
  assert.equal(
    spec.protocols.dali.find((item) => item.name === "DALI IEC 62386 parts")?.confidence,
    "unknown",
  );
});

test("normalizeSpec preserves conflict parameters instead of choosing a winner", () => {
  const empty = createEmptySpec({ brand: "Acme", product: "Smart Driver" }, "2026-06-16T00:00:00.000Z");
  const spec = normalizeSpec(
    { brand: "Acme", product: "Smart Driver" },
    {
      ...empty,
      electrical: [
        {
          name: "Input voltage",
          value: "120 V",
          unit: "VAC",
          sourceIds: ["S1"],
          confidence: "medium",
          status: "conflict",
          notes: "S2 states 230 V.",
        },
        {
          name: "Input voltage",
          value: "230 V",
          unit: "VAC",
          sourceIds: ["S2"],
          confidence: "medium",
          status: "conflict",
          notes: "S1 states 120 V.",
        },
      ],
    },
  );

  const conflicts = spec.electrical.filter((item) => item.name === "Input voltage");
  assert.equal(conflicts.length, 2);
  assert.deepEqual(
    conflicts.map((item) => item.value),
    ["120 V", "230 V"],
  );
});
