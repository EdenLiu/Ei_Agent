import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import type { ProductInput } from "./types.js";

export type CliArgs = ProductInput & {
  outputRoot?: string;
};

export function parseArgs(argv: string[]): CliArgs {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current) {
      continue;
    }

    if (!current.startsWith("--")) {
      throw new Error(`Unexpected argument: ${current}`);
    }

    const [rawKey, inlineValue] = current.slice(2).split("=", 2);
    const value = inlineValue ?? argv[index + 1];

    if (!rawKey || !value || value.startsWith("--")) {
      throw new Error(`Missing value for --${rawKey}`);
    }

    if (inlineValue === undefined) {
      index += 1;
    }

    parsed[rawKey] = value;
  }

  return {
    brand: parsed.brand ?? "",
    product: parsed.product ?? "",
    model: emptyToUndefined(parsed.model),
    region: emptyToUndefined(parsed.region),
    outputRoot: emptyToUndefined(parsed.output),
  };
}

export async function collectProductInput(args: CliArgs): Promise<CliArgs> {
  if (args.brand.trim() && args.product.trim()) {
    return trimInput(args);
  }

  const rl = createInterface({ input, output });

  try {
    const brand = args.brand.trim() || (await rl.question("Brand: "));
    const product = args.product.trim() || (await rl.question("Product: "));
    const model = args.model ?? emptyToUndefined(await rl.question("Model (optional): "));
    const region = args.region ?? emptyToUndefined(await rl.question("Region/version (optional): "));

    return trimInput({
      ...args,
      brand,
      product,
      model,
      region,
    });
  } finally {
    rl.close();
  }
}

export function validateInput(inputValue: ProductInput): void {
  if (!inputValue.brand.trim()) {
    throw new Error("Brand is required. Pass --brand or enter it interactively.");
  }

  if (!inputValue.product.trim()) {
    throw new Error("Product is required. Pass --product or enter it interactively.");
  }
}

export function productLabel(inputValue: ProductInput): string {
  return [inputValue.brand, inputValue.product, inputValue.model].filter(Boolean).join(" ");
}

function trimInput(args: CliArgs): CliArgs {
  return {
    ...args,
    brand: args.brand.trim(),
    product: args.product.trim(),
    model: emptyToUndefined(args.model),
    region: emptyToUndefined(args.region),
    outputRoot: emptyToUndefined(args.outputRoot),
  };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
