# IoT Lighting Requirement Analysis Agent

CLI agent for competitor research on IoT lighting products. Provide a brand and product name, and the agent uses OpenAI Responses API hosted web search to collect public sources, extract hardware/electrical/wireless/protocol details, and write developer-readable local artifacts.

## Setup

```bash
npm install
```

Create `.env`:

```bash
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4.1-mini
```

## Run

```bash
npm run dev -- --brand "Acme" --product "Smart DALI Driver" --model "XYZ-100" --region "EU"
```

If `--brand` or `--product` is missing, the CLI prompts for the missing fields. `--model` and `--region` are optional but recommended when a product line has multiple variants.

Generated files are written under `outputs/<brand>-<product>-<timestamp>/`:

- `Spec.md`: developer-facing Markdown spec.
- `research.json`: structured data including confidence, status, source IDs, and raw model JSON.
- `sources.md`: ranked source list with source type and notes.

## Research Policy

The agent prioritizes manufacturer pages, datasheets, manuals, installation guides, and certification databases. Retailer and secondary pages are only low-confidence supplements. Missing values are marked `Unknown`; unsupported values must not be invented.

The generated spec covers:

- Hardware parameters.
- Electrical parameters.
- Wireless communication parameters.
- Protocol support, including Bluetooth models/services, Zigbee clusters/endpoints, and DALI IEC 62386 parts such as 103, 207, 209, 251, 252, and 253 when sources provide them.

## Check

```bash
npm run build
npm run test
```

`npm audit --omit=dev` should be clean for production dependencies. The current dev toolchain still reports an `tsx -> esbuild` advisory with no npm fix available.
