import OpenAI from "openai";
import type { Response, ResponseOutputText } from "openai/resources/responses/responses";
import type { OpenAIConfig } from "./config.js";
import { createEmptySpec, normalizeSpec } from "./schema.js";
import { normalizeSources } from "./sourcePolicy.js";
import type { ProductInput, RequirementSpec, ResearchClient, ResearchResult, Source } from "./types.js";

type ResearchJson = {
  needsClarification?: boolean;
  clarificationQuestions?: string[];
  spec?: RequirementSpec;
};

export class OpenAIResearchClient implements ResearchClient {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly baseURL?: string;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    this.model = config.model;
    this.baseURL = config.baseURL;
  }

  async research(input: ProductInput): Promise<ResearchResult> {
    let response: Response;

    try {
      response = await this.client.responses.create({
        model: this.model,
        instructions: buildInstructions(),
        input: buildPrompt(input),
        tools: [
          {
            type: "web_search",
            search_context_size: "high",
          },
        ],
        include: ["web_search_call.action.sources", "web_search_call.results"],
        text: {
          format: {
            type: "json_object",
          },
        },
      });
    } catch (error) {
      throw new Error(
        `OpenAI research failed for model "${this.model}"${
          this.baseURL ? ` via base URL "${this.baseURL}"` : ""
        }. Ensure OPENAI_MODEL and OPENAI_BASE_URL are configured correctly. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const rawText = extractOutputText(response);
    const parsed = parseResearchJson(rawText);
    const citedSources = extractCitationSources(response);
    const modelSpec = parsed.spec ?? createEmptySpec(input);
    const spec = normalizeSpec(input, mergeSources(modelSpec, citedSources));

    return {
      needsClarification: parsed.needsClarification ?? false,
      clarificationQuestions: parsed.clarificationQuestions ?? [],
      spec,
      rawText,
    };
  }
}

export function extractOutputText(response: Response): string {
  return response.output
    .flatMap((item) => {
      if (item.type !== "message") return [];
      return item.content
        .filter((content): content is ResponseOutputText => content.type === "output_text")
        .map((content) => content.text);
    })
    .join("\n")
    .trim();
}

export function parseResearchJson(text: string): ResearchJson {
  try {
    const parsed = JSON.parse(text) as ResearchJson;

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Response JSON is not an object.");
    }

    return parsed;
  } catch (error) {
    throw new Error(
      `Model did not return valid research JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function mergeSources(spec: RequirementSpec, citedSources: Source[]): RequirementSpec {
  const byUrl = new Map<string, Source>();

  for (const source of [...spec.sources, ...citedSources]) {
    if (!source.url) continue;
    const key = source.url.toLowerCase();
    const existing = byUrl.get(key);
    byUrl.set(key, existing ? preferSource(existing, source) : source);
  }

  return {
    ...spec,
    sources: normalizeSources([...byUrl.values()]),
  };
}

function preferSource(left: Source, right: Source): Source {
  return left.notes.length >= right.notes.length ? left : right;
}

function extractCitationSources(response: Response): Source[] {
  const citations: Source[] = [];
  let citationIndex = 1;
  let searchIndex = 1;

  for (const item of response.output) {
    if (item.type === "web_search_call" && item.action.type === "search") {
      for (const source of item.action.sources ?? []) {
        citations.push({
          id: `W${searchIndex}`,
          title: source.url,
          url: source.url,
          kind: "unknown",
          rank: 9,
          confidence: "unknown",
          notes: "Returned by web search action sources.",
        });
        searchIndex += 1;
      }
    }

    if (item.type !== "message") continue;

    for (const content of item.content) {
      if (content.type !== "output_text") continue;

      for (const annotation of content.annotations) {
        if (annotation.type !== "url_citation") continue;
        citations.push({
          id: `C${citationIndex}`,
          title: annotation.title || annotation.url,
          url: annotation.url,
          kind: "unknown",
          rank: 9,
          confidence: "unknown",
          notes: "Cited by model output.",
        });
        citationIndex += 1;
      }
    }
  }

  return citations;
}

function buildInstructions(): string {
  return [
    "You are an IoT lighting competitor research agent for a product development team.",
    "Use web search and prioritize manufacturer product pages, datasheets, manuals, installation guides, and certification databases.",
    "Use retailer or secondary sources only as low-confidence supplements.",
    "Do not invent unsupported parameters. Mark missing fields as Unknown with status unknown and confidence unknown.",
    "Preserve conflicting values as separate parameters with status conflict and explain the conflict in notes.",
    "Return strict JSON only. Do not include Markdown.",
  ].join(" ");
}

function buildPrompt(input: ProductInput): string {
  return JSON.stringify({
    task: "Research the competitor IoT lighting product and produce a structured developer-facing requirement spec.",
    product: input,
    requiredJsonShape: {
      needsClarification: "boolean. true only when brand/product/model is ambiguous enough to risk analyzing the wrong product.",
      clarificationQuestions: "array of concrete questions when needsClarification is true.",
      spec: {
        identity: {
          brand: "string",
          product: "string",
          model: "string or omitted",
          region: "string or omitted",
          analyzedAt: "ISO timestamp",
        },
        sources: [
          {
            id: "S1",
            title: "source title",
            url: "source url",
            kind: "manufacturer|datasheet|manual|certification|retailer|secondary|unknown",
            rank: 1,
            confidence: "high|medium|low|unknown",
            notes: "short evidence note",
          },
        ],
        sourceSummary: {
          coverage: ["what the sources establish"],
          conflicts: ["conflicting claims with source IDs"],
          missingAreas: ["important missing areas"],
        },
        hardware: "array of parameter objects",
        electrical: "array of parameter objects",
        wireless: "array of parameter objects",
        protocols: {
          bluetooth: "array of parameter objects for profiles/services/models/features",
          zigbee: "array of parameter objects for device type/endpoints/clusters/roles",
          dali: "array of parameter objects for IEC 62386 parts such as 103, 207, 209, 251, 252, 253",
          other: "array of parameter objects for Wi-Fi, Matter, Thread, KNX, DMX, etc.",
        },
        followUps: ["recommended manual checks for unknown or conflicting data"],
      },
      parameterObject: {
        name: "string",
        value: "string",
        unit: "optional string",
        sourceIds: ["S1"],
        confidence: "high|medium|low|unknown",
        status: "found|unknown|conflict",
        notes: "optional string",
      },
    },
  });
}
