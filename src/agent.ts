import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import type { ProductInput, ResearchClient, ResearchResult } from "./types.js";

export async function runAnalysis(inputValue: ProductInput, client: ResearchClient): Promise<ResearchResult> {
  const firstResult = await client.research(inputValue);

  if (!firstResult.needsClarification || firstResult.clarificationQuestions.length === 0) {
    return firstResult;
  }

  const clarification = await askClarification(firstResult.clarificationQuestions);
  const clarifiedInput = {
    ...inputValue,
    product: `${inputValue.product} ${clarification}`.trim(),
  };

  return client.research(clarifiedInput);
}

async function askClarification(questions: string[]): Promise<string> {
  const rl = createInterface({ input, output });

  try {
    console.log("\nThe product appears ambiguous. Please clarify before research continues:");
    for (const question of questions) {
      console.log(`- ${question}`);
    }

    return rl.question("Clarification: ");
  } finally {
    rl.close();
  }
}
