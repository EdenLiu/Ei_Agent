import "dotenv/config";

import { join } from "node:path";
import { runAnalysis } from "./agent.js";
import { collectProductInput, parseArgs, productLabel, validateInput } from "./cli.js";
import { OpenAIResearchClient } from "./openaiResearchClient.js";
import { writeResearchOutputs } from "./outputWriter.js";

async function main(): Promise<void> {
  const args = await collectProductInput(parseArgs(process.argv.slice(2)));
  validateInput(args);

  const outputRoot = args.outputRoot ?? join(process.cwd(), "outputs");
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const client = new OpenAIResearchClient(process.env.OPENAI_API_KEY, model);

  console.log(`Researching ${productLabel(args)} with ${model}...`);
  const result = await runAnalysis(args, client);
  const paths = await writeResearchOutputs(outputRoot, args, result);

  console.log("\nAnalysis complete.");
  console.log(`Spec: ${paths.specPath}`);
  console.log(`Research JSON: ${paths.researchPath}`);
  console.log(`Sources: ${paths.sourcesPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
