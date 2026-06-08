import "dotenv/config";

import OpenAI from "openai";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

const MAX_STEPS = 5;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

type RequirementAnalysis = {
  goal: string;
  targetUsers: string[];
  coreFeatures: string[];
  openQuestions: string[];
  risks: string[];
};

type AnalyzeRequirementArgs = {
  requirement: string;
};

type ToolDefinition = {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: boolean;
  };
  strict: boolean;
};

type ToolCallOutput = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tools: ToolDefinition[] = [
  {
    type: "function",
    name: "analyze_requirement",
    description:
      "Extract a first-pass structured analysis from a raw product requirement.",
    parameters: {
      type: "object",
      properties: {
        requirement: {
          type: "string",
          description: "The original user requirement text.",
        },
      },
      required: ["requirement"],
      additionalProperties: false,
    },
    strict: true,
  },
];

const toolRegistry = {
  analyze_requirement(args: AnalyzeRequirementArgs): RequirementAnalysis {
    const text = args.requirement.trim();
    const lowerText = text.toLowerCase();

    const targetUsers = inferTargetUsers(text);
    const coreFeatures = inferCoreFeatures(lowerText);
    const risks = inferRisks(lowerText);

    return {
      goal: text || "Clarify the product goal before analysis.",
      targetUsers,
      coreFeatures,
      openQuestions: [
        "Who is the primary user, and what problem do they need solved first?",
        "What is the minimum successful workflow for the first version?",
        "What data needs to be stored, imported, or exported?",
      ],
      risks,
    };
  },
};

function inferTargetUsers(requirement: string): string[] {
  const users = new Set<string>();

  if (requirement.includes("医生")) users.add("医生");
  if (requirement.includes("患者")) users.add("患者");
  if (requirement.includes("老师") || requirement.includes("教师")) {
    users.add("教师");
  }
  if (requirement.includes("学生")) users.add("学生");
  if (requirement.includes("团队")) users.add("团队成员");
  if (requirement.includes("管理")) users.add("管理员");

  if (users.size === 0) {
    users.add("待澄清的目标用户");
  }

  return [...users];
}

function inferCoreFeatures(lowerText: string): string[] {
  const features = new Set<string>();

  if (lowerText.includes("task") || lowerText.includes("任务")) {
    features.add("任务创建、状态跟踪和列表管理");
  }
  if (lowerText.includes("ai") || lowerText.includes("智能")) {
    features.add("AI 辅助分析或生成");
  }
  if (lowerText.includes("摘要") || lowerText.includes("总结")) {
    features.add("内容摘要生成");
  }
  if (lowerText.includes("提醒") || lowerText.includes("通知")) {
    features.add("提醒和通知");
  }
  if (lowerText.includes("分析")) {
    features.add("结构化分析输出");
  }

  if (features.size === 0) {
    features.add("核心工作流待澄清");
  }

  return [...features];
}

function inferRisks(lowerText: string): string[] {
  const risks = new Set<string>();

  if (lowerText.includes("医生") || lowerText.includes("医疗") || lowerText.includes("病历")) {
    risks.add("医疗场景需要明确合规、隐私和人工复核边界");
  }
  if (lowerText.includes("ai") || lowerText.includes("智能")) {
    risks.add("AI 输出需要处理不准确、不可解释或过度依赖的问题");
  }
  if (lowerText.length < 20) {
    risks.add("需求描述过短，容易导致范围误判");
  }

  if (risks.size === 0) {
    risks.add("需求边界和验收标准尚不明确");
  }

  return [...risks];
}

function parseToolArgs(rawArgs: string): AnalyzeRequirementArgs {
  const parsed: unknown = JSON.parse(rawArgs);

  if (!isAnalyzeRequirementArgs(parsed)) {
    throw new Error("Invalid arguments for analyze_requirement.");
  }

  return parsed;
}

function isAnalyzeRequirementArgs(value: unknown): value is AnalyzeRequirementArgs {
  return (
    typeof value === "object" &&
    value !== null &&
    "requirement" in value &&
    typeof value.requirement === "string"
  );
}

function extractFinalText(response: OpenAI.Responses.Response): string {
  return response.output
    .flatMap((item) => {
      if (item.type !== "message") return [];
      return item.content
        .filter((content) => content.type === "output_text")
        .map((content) => content.text);
    })
    .join("\n")
    .trim();
}

async function runAgent(userRequirement: string): Promise<string> {
  let inputItems: OpenAI.Responses.ResponseInput = [
    {
      role: "user",
      content: userRequirement,
    },
  ];

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    const response = await client.responses.create({
      model: MODEL,
      instructions:
        "You are a requirement analysis agent. Use tools when useful. Return concise, structured Chinese output. If the requirement is unclear, ask concrete clarification questions instead of inventing details.",
      input: inputItems,
      tools,
    });

    const functionCalls = response.output.filter(
      (item) => item.type === "function_call",
    );

    if (functionCalls.length === 0) {
      const finalText = extractFinalText(response);
      return finalText || "模型没有返回可读输出。";
    }

    const toolOutputs: ToolCallOutput[] = [];

    for (const call of functionCalls) {
      if (call.name !== "analyze_requirement") {
        toolOutputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify({ error: `Unknown tool: ${call.name}` }),
        });
        continue;
      }

      try {
        const args = parseToolArgs(call.arguments);
        const result = toolRegistry.analyze_requirement(args);

        toolOutputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(result),
        });
      } catch (error) {
        toolOutputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify({
            error: error instanceof Error ? error.message : "Tool failed.",
          }),
        });
      }
    }

    inputItems = [
      ...response.output,
      ...toolOutputs,
    ] as OpenAI.Responses.ResponseInput;
  }

  return `Agent stopped after ${MAX_STEPS} steps. Try narrowing the requirement.`;
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Create a .env file first.");
  }

  const rl = createInterface({ input, output });

  try {
    const requirement = await rl.question("请输入你的产品需求：");
    const answer = await runAgent(requirement);

    console.log("\nAgent 输出：\n");
    console.log(answer);
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
