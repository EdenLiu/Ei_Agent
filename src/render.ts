import type { ParameterValue, RequirementSpec, Source } from "./types.js";

export function renderSpecMarkdown(spec: RequirementSpec): string {
  const title = [spec.identity.brand, spec.identity.product, spec.identity.model]
    .filter(Boolean)
    .join(" ");

  return [
    `# ${title} Requirement Spec`,
    "",
    "## Product Identity",
    table([
      ["Brand", spec.identity.brand],
      ["Product", spec.identity.product],
      ["Model", spec.identity.model ?? "Unknown"],
      ["Region/version", spec.identity.region ?? "Unknown"],
      ["Analyzed at", spec.identity.analyzedAt],
    ]),
    "",
    "## Source Summary",
    listBlock("Coverage", spec.sourceSummary.coverage),
    listBlock("Conflicts", spec.sourceSummary.conflicts),
    listBlock("Missing areas", spec.sourceSummary.missingAreas),
    "",
    "## Hardware Parameters",
    parameterTable(spec.hardware),
    "",
    "## Electrical Parameters",
    parameterTable(spec.electrical),
    "",
    "## Wireless Communication",
    parameterTable(spec.wireless),
    "",
    "## Protocol Support",
    "### Bluetooth",
    parameterTable(spec.protocols.bluetooth),
    "",
    "### Zigbee",
    parameterTable(spec.protocols.zigbee),
    "",
    "### DALI",
    parameterTable(spec.protocols.dali),
    "",
    "### Other Protocols",
    parameterTable(spec.protocols.other),
    "",
    "## Follow-up Questions",
    bulletList(spec.followUps),
  ].join("\n");
}

export function renderSourcesMarkdown(sources: Source[]): string {
  return [
    "# Sources",
    "",
    "| ID | Rank | Kind | Confidence | Title | URL | Notes |",
    "| --- | ---: | --- | --- | --- | --- | --- |",
    ...sources.map(
      (source) =>
        `| ${escapeCell(source.id)} | ${source.rank} | ${escapeCell(source.kind)} | ${escapeCell(
          source.confidence,
        )} | ${escapeCell(source.title)} | ${escapeCell(source.url)} | ${escapeCell(source.notes)} |`,
    ),
    "",
  ].join("\n");
}

function parameterTable(values: ParameterValue[]): string {
  if (values.length === 0) {
    return "_No sourced protocol or parameter data found._";
  }

  return [
    "| Parameter | Value | Unit | Status | Confidence | Sources | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...values.map(
      (value) =>
        `| ${escapeCell(value.name)} | ${escapeCell(value.value)} | ${escapeCell(
          value.unit ?? "",
        )} | ${escapeCell(value.status)} | ${escapeCell(value.confidence)} | ${escapeCell(
          value.sourceIds.join(", "),
        )} | ${escapeCell(value.notes ?? "")} |`,
    ),
  ].join("\n");
}

function table(rows: [string, string][]): string {
  return [
    "| Field | Value |",
    "| --- | --- |",
    ...rows.map(([key, value]) => `| ${escapeCell(key)} | ${escapeCell(value)} |`),
  ].join("\n");
}

function listBlock(label: string, values: string[]): string {
  return [`**${label}:**`, bulletList(values)].join("\n");
}

function bulletList(values: string[]): string {
  if (values.length === 0) {
    return "- None";
  }

  return values.map((value) => `- ${value}`).join("\n");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}
