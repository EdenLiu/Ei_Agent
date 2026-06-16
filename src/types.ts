export type Confidence = "high" | "medium" | "low" | "unknown";

export type FieldStatus = "found" | "unknown" | "conflict";

export type SourceKind =
  | "manufacturer"
  | "datasheet"
  | "manual"
  | "certification"
  | "retailer"
  | "secondary"
  | "unknown";

export type ProductInput = {
  brand: string;
  product: string;
  model?: string;
  region?: string;
};

export type ResearchOptions = {
  model: string;
  outputRoot: string;
};

export type Source = {
  id: string;
  title: string;
  url: string;
  kind: SourceKind;
  rank: number;
  confidence: Confidence;
  notes: string;
};

export type ParameterValue = {
  name: string;
  value: string;
  unit?: string;
  sourceIds: string[];
  confidence: Confidence;
  status: FieldStatus;
  notes?: string;
};

export type ProtocolSupport = {
  bluetooth: ParameterValue[];
  zigbee: ParameterValue[];
  dali: ParameterValue[];
  other: ParameterValue[];
};

export type SourceSummary = {
  coverage: string[];
  conflicts: string[];
  missingAreas: string[];
};

export type ProductIdentity = ProductInput & {
  analyzedAt: string;
};

export type RequirementSpec = {
  identity: ProductIdentity;
  sources: Source[];
  sourceSummary: SourceSummary;
  hardware: ParameterValue[];
  electrical: ParameterValue[];
  wireless: ParameterValue[];
  protocols: ProtocolSupport;
  followUps: string[];
};

export type ResearchResult = {
  needsClarification: boolean;
  clarificationQuestions: string[];
  spec: RequirementSpec;
  rawText: string;
};

export interface ResearchClient {
  research(input: ProductInput): Promise<ResearchResult>;
}
