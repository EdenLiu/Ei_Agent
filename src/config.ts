const DEFAULT_MODEL = "gpt-4.1-mini";

export type OpenAIConfig = {
  apiKey: string;
  model: string;
  baseURL?: string;
};

export function loadOpenAIConfig(env: NodeJS.ProcessEnv): OpenAIConfig {
  const apiKey = normalizeEnvValue(env.OPENAI_API_KEY);

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Create a .env file or set the environment variable.");
  }

  return {
    apiKey,
    model: normalizeEnvValue(env.OPENAI_MODEL) ?? DEFAULT_MODEL,
    baseURL: normalizeEnvValue(env.OPENAI_BASE_URL),
  };
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
