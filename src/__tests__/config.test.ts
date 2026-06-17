import assert from "node:assert/strict";
import test from "node:test";
import { loadOpenAIConfig } from "../config.js";

test("loadOpenAIConfig loads official OpenAI defaults", () => {
  const config = loadOpenAIConfig({
    OPENAI_API_KEY: "sk-test",
  });

  assert.equal(config.apiKey, "sk-test");
  assert.equal(config.model, "gpt-4.1-mini");
  assert.equal(config.baseURL, undefined);
});

test("loadOpenAIConfig supports OpenAI-compatible relay base URL", () => {
  const config = loadOpenAIConfig({
    OPENAI_API_KEY: "relay-key",
    OPENAI_MODEL: "gpt-4.1-mini",
    OPENAI_BASE_URL: " https://relay.example.com/v1 ",
  });

  assert.equal(config.apiKey, "relay-key");
  assert.equal(config.model, "gpt-4.1-mini");
  assert.equal(config.baseURL, "https://relay.example.com/v1");
});

test("loadOpenAIConfig rejects missing API key", () => {
  assert.throws(() => loadOpenAIConfig({}), /Missing OPENAI_API_KEY/);
});
