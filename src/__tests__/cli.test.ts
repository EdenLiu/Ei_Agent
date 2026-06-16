import assert from "node:assert/strict";
import test from "node:test";
import { parseArgs, validateInput } from "../cli.js";

test("parseArgs supports named competitor product fields", () => {
  const args = parseArgs([
    "--brand",
    "Acme",
    "--product=Smart Driver",
    "--model",
    "DALI-2",
    "--region",
    "EU",
  ]);

  assert.equal(args.brand, "Acme");
  assert.equal(args.product, "Smart Driver");
  assert.equal(args.model, "DALI-2");
  assert.equal(args.region, "EU");
});

test("parseArgs rejects missing option values", () => {
  assert.throws(() => parseArgs(["--brand"]), /Missing value/);
});

test("validateInput enforces brand and product after interactive fallback", () => {
  assert.throws(() => validateInput({ brand: "", product: "Lamp" }), /Brand is required/);
  assert.throws(() => validateInput({ brand: "Acme", product: "" }), /Product is required/);
});
