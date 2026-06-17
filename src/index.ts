import { config } from "dotenv";
config({ override: true });

import { join } from "node:path";
import { runAnalysis } from "./agent.js";
import { collectProductInput, parseArgs, productLabel, validateInput } from "./cli.js";
import { loadOpenAIConfig } from "./config.js";
import { OpenAIResearchClient } from "./openaiResearchClient.js";
import { writeResearchOutputs } from "./outputWriter.js";

async function main(): Promise<void> {
  const args = await collectProductInput(parseArgs(process.argv.slice(2)));
  validateInput(args);

  const outputRoot = args.outputRoot ?? join(process.cwd(), "outputs");
  const openAIConfig = loadOpenAIConfig(process.env);
  const client = new OpenAIResearchClient(openAIConfig);

  console.log(`Researching ${productLabel(args)} with ${openAIConfig.model}...`);
  if (openAIConfig.baseURL) {
    console.log(`Using OpenAI-compatible base URL: ${openAIConfig.baseURL}`);
  }
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
