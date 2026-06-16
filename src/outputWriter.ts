import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderSourcesMarkdown, renderSpecMarkdown } from "./render.js";
import type { ProductInput, ResearchResult } from "./types.js";

export type OutputPaths = {
  directory: string;
  specPath: string;
  researchPath: string;
  sourcesPath: string;
};

export async function writeResearchOutputs(
  outputRoot: string,
  input: ProductInput,
  result: ResearchResult,
): Promise<OutputPaths> {
  const directory = join(
    outputRoot,
    `${slugify([input.brand, input.product, input.model].filter(Boolean).join("-"))}-${timestampSlug()}`,
  );
  const specPath = join(directory, "Spec.md");
  const researchPath = join(directory, "research.json");
  const sourcesPath = join(directory, "sources.md");

  await mkdir(directory, { recursive: true });
  await writeFile(specPath, renderSpecMarkdown(result.spec), "utf8");
  await writeFile(
    researchPath,
    `${JSON.stringify(
      {
        ...result,
        rawText: result.rawText,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(sourcesPath, renderSourcesMarkdown(result.spec.sources), "utf8");

  return {
    directory,
    specPath,
    researchPath,
    sourcesPath,
  };
}

export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "product"
  );
}

function timestampSlug(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}
