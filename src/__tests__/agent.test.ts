import assert from "node:assert/strict";
import test from "node:test";
import { runAnalysis } from "../agent.js";
import { createEmptySpec } from "../schema.js";
import type { ProductInput, ResearchClient, ResearchResult } from "../types.js";

test("runAnalysis returns the first result when product identity is unambiguous", async () => {
  const client = new MockResearchClient([
    {
      needsClarification: false,
      clarificationQuestions: [],
      spec: createEmptySpec({ brand: "Acme", product: "Smart Driver" }),
      rawText: "{}",
    },
  ]);

  const result = await runAnalysis({ brand: "Acme", product: "Smart Driver" }, client);

  assert.equal(result.needsClarification, false);
  assert.equal(client.calls.length, 1);
});

class MockResearchClient implements ResearchClient {
  readonly calls: ProductInput[] = [];

  constructor(private readonly results: ResearchResult[]) {}

  async research(input: ProductInput): Promise<ResearchResult> {
    this.calls.push(input);
    const result = this.results.shift();
    assert.ok(result, "Unexpected research call");
    return result;
  }
}
