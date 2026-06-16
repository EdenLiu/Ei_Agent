import type { Confidence, Source, SourceKind } from "./types.js";

const SOURCE_KIND_RANK: Record<SourceKind, number> = {
  manufacturer: 1,
  datasheet: 1,
  manual: 2,
  certification: 2,
  retailer: 5,
  secondary: 6,
  unknown: 9,
};

const SOURCE_KIND_CONFIDENCE: Record<SourceKind, Confidence> = {
  manufacturer: "high",
  datasheet: "high",
  manual: "high",
  certification: "high",
  retailer: "low",
  secondary: "medium",
  unknown: "unknown",
};

const CERTIFICATION_DOMAINS = [
  "bluetooth.com",
  "csa-iot.org",
  "zigbeealliance.org",
  "dali-alliance.org",
  "fcc.gov",
  "ul.com",
  "intertek.com",
  "ce-marking.org",
];

export function classifySource(url: string, title: string): SourceKind {
  const normalizedUrl = url.toLowerCase();
  const normalizedTitle = title.toLowerCase();

  if (CERTIFICATION_DOMAINS.some((domain) => normalizedUrl.includes(domain))) {
    return "certification";
  }

  if (/(datasheet|data sheet|specification|spec sheet)/i.test(title)) {
    return "datasheet";
  }

  if (/(manual|installation guide|user guide|instructions)/i.test(title)) {
    return "manual";
  }

  if (/(amazon|aliexpress|ebay|walmart|homedepot|lowes)\./i.test(normalizedUrl)) {
    return "retailer";
  }

  if (
    /(official|manufacturer|product page)/i.test(normalizedTitle) ||
    normalizedUrl.includes("/products/") ||
    normalizedUrl.includes("/product/")
  ) {
    return "manufacturer";
  }

  return "secondary";
}

export function rankSource(kind: SourceKind): number {
  return SOURCE_KIND_RANK[kind];
}

export function confidenceForSource(kind: SourceKind): Confidence {
  return SOURCE_KIND_CONFIDENCE[kind];
}

export function normalizeSources(sources: Omit<Source, "rank" | "confidence">[]): Source[] {
  return sources
    .map((source) => {
      const kind = source.kind === "unknown" ? classifySource(source.url, source.title) : source.kind;

      return {
        ...source,
        kind,
        rank: rankSource(kind),
        confidence: confidenceForSource(kind),
      };
    })
    .sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id));
}
