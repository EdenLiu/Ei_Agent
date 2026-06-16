import type { ParameterValue, ProductInput, RequirementSpec, Source } from "./types.js";
import { normalizeSources } from "./sourcePolicy.js";

export const UNKNOWN_VALUE = "Unknown";

export function unknownParameter(name: string, notes?: string): ParameterValue {
  return {
    name,
    value: UNKNOWN_VALUE,
    sourceIds: [],
    confidence: "unknown",
    status: "unknown",
    notes: notes ?? "No reliable public source found.",
  };
}

export function ensureUnknownFields(spec: RequirementSpec): RequirementSpec {
  return {
    ...spec,
    hardware: ensureSection(spec.hardware, [
      "MCU/SoC",
      "Sensors",
      "Drivers",
      "Ports",
      "Memory",
      "Dimensions",
      "Enclosure",
      "Operating environment",
    ]),
    electrical: ensureSection(spec.electrical, [
      "Input voltage",
      "Output voltage/current",
      "Power",
      "Standby power",
      "Dimming range",
      "Isolation",
      "Certifications",
      "Wiring",
    ]),
    wireless: ensureSection(spec.wireless, [
      "Radios",
      "Frequency bands",
      "PHY/version",
      "Range",
      "Antenna",
      "Security",
      "Commissioning",
    ]),
    protocols: {
      bluetooth: ensureSection(spec.protocols.bluetooth, ["Bluetooth profiles/services/models/features"]),
      zigbee: ensureSection(spec.protocols.zigbee, ["Zigbee device type/endpoints/clusters/roles"]),
      dali: ensureSection(spec.protocols.dali, ["DALI IEC 62386 parts"]),
      other: spec.protocols.other,
    },
  };
}

export function createEmptySpec(input: ProductInput, analyzedAt = new Date().toISOString()): RequirementSpec {
  return ensureUnknownFields({
    identity: {
      brand: input.brand,
      product: input.product,
      model: input.model,
      region: input.region,
      analyzedAt,
    },
    sources: [],
    sourceSummary: {
      coverage: [],
      conflicts: [],
      missingAreas: [],
    },
    hardware: [],
    electrical: [],
    wireless: [],
    protocols: {
      bluetooth: [],
      zigbee: [],
      dali: [],
      other: [],
    },
    followUps: [],
  });
}

export function normalizeSpec(input: ProductInput, rawSpec: RequirementSpec): RequirementSpec {
  const spec = ensureUnknownFields({
    ...rawSpec,
    identity: {
      ...rawSpec.identity,
      brand: rawSpec.identity.brand || input.brand,
      product: rawSpec.identity.product || input.product,
      model: rawSpec.identity.model || input.model,
      region: rawSpec.identity.region || input.region,
      analyzedAt: rawSpec.identity.analyzedAt || new Date().toISOString(),
    },
    sources: normalizeSources(rawSpec.sources.map(normalizeSourceForRanking)),
  });

  return {
    ...spec,
    sourceSummary: {
      coverage: spec.sourceSummary.coverage ?? [],
      conflicts: spec.sourceSummary.conflicts ?? [],
      missingAreas: spec.sourceSummary.missingAreas ?? [],
    },
    followUps: spec.followUps ?? [],
  };
}

function ensureSection(values: ParameterValue[], requiredNames: string[]): ParameterValue[] {
  const existingNames = new Set(values.map((item) => normalizeName(item.name)));
  const missing = requiredNames
    .filter((name) => !existingNames.has(normalizeName(name)))
    .map((name) => unknownParameter(name));

  return [...values.map(normalizeParameter), ...missing];
}

function normalizeParameter(value: ParameterValue): ParameterValue {
  if (value.status === "unknown" || value.value.trim() === "") {
    return {
      ...value,
      value: UNKNOWN_VALUE,
      sourceIds: value.sourceIds ?? [],
      confidence: "unknown",
      status: "unknown",
    };
  }

  return {
    ...value,
    sourceIds: value.sourceIds ?? [],
  };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeSourceForRanking(source: Source): Omit<Source, "rank" | "confidence"> {
  return {
    id: source.id,
    title: source.title,
    url: source.url,
    kind: source.kind,
    notes: source.notes,
  };
}
