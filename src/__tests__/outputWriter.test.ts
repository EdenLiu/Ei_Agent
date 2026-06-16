import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createEmptySpec } from "../schema.js";
import { slugify, writeResearchOutputs } from "../outputWriter.js";

test("slugify keeps output directory names filesystem-friendly", () => {
  assert.equal(slugify("Acme Smart DALI Driver / EU"), "acme-smart-dali-driver-eu");
});

test("writeResearchOutputs writes Spec, research JSON, and sources artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "requirement-agent-"));

  try {
    const spec = createEmptySpec(
      { brand: "Acme", product: "Smart DALI Driver", model: "XYZ-100" },
      "2026-06-16T00:00:00.000Z",
    );
    const paths = await writeResearchOutputs(
      root,
      { brand: "Acme", product: "Smart DALI Driver", model: "XYZ-100" },
      {
        needsClarification: false,
        clarificationQuestions: [],
        spec,
        rawText: "{}",
      },
    );

    const specMarkdown = await readFile(paths.specPath, "utf8");
    const researchJson = JSON.parse(await readFile(paths.researchPath, "utf8")) as Record<string, unknown>;
    const sourcesMarkdown = await readFile(paths.sourcesPath, "utf8");

    assert.match(specMarkdown, /# Acme Smart DALI Driver XYZ-100 Requirement Spec/);
    assert.equal(researchJson.rawText, "{}");
    assert.match(sourcesMarkdown, /# Sources/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
