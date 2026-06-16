import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSources } from "../sourcePolicy.js";

test("normalizeSources ranks official and certification sources before retailer data", () => {
  const sources = normalizeSources([
    {
      id: "S3",
      title: "Retail listing",
      url: "https://www.amazon.com/example",
      kind: "unknown",
      notes: "Retail data.",
    },
    {
      id: "S1",
      title: "Official product page",
      url: "https://example.com/products/driver",
      kind: "unknown",
      notes: "Manufacturer data.",
    },
    {
      id: "S2",
      title: "DALI Alliance listing",
      url: "https://www.dali-alliance.org/products/example",
      kind: "unknown",
      notes: "Certification data.",
    },
  ]);

  assert.deepEqual(
    sources.map((source) => source.id),
    ["S1", "S2", "S3"],
  );
  assert.equal(sources[0]?.confidence, "high");
  assert.equal(sources[2]?.kind, "retailer");
});
