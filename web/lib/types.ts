// The VC Brain data model. One shape, read by everything — mirrors docs/ARCHITECTURE.md §Memory.
// Every claim traces to a Source; every score ships as an interval, never a bare number.

export type SourceKind =
  | "github"
  | "launch" // Product Hunt / HN Show / launch post
  | "hackathon"
  | "paper" // arXiv / preprint
  | "patent"
  | "accelerator"
  | "public_profile" // LinkedIn-equivalent public page
  | "social_post" // X/Twitter-style public post
  | "web"
  | "deck"
  | "interview"
  | "diligence_engine"; // derived from a diligence-service route

export interface Source {
  id: string;
  url: string;
  kind: SourceKind;
  fetchedAt: string; // ISO
  title?: string;
}

export type SubjectType = "founder" | "company";

// No claim without a source — the anti-slop rule: every claim must trace to evidence.
export interface Claim {
  id: string;
  subjectId: string;
  subjectType: SubjectType;
  text: string;
  sourceId: string;
  confidence: number; // 0..1 — per-claim, strengthens/weakens via Memory (see lib/memory/founder-score.ts)
  timestamp: string; // ISO
  contradictedBy?: string[]; // claim ids that conflict with this one — feeds Trust Score signalAgreement
}

export interface Founder {
  id: string;
  name: string;
  companyIds: string[];
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
}

// "Startup" — the company a founder is building.
export interface Startup {
  id: string;
  name: string;
  website?: string;
  oneLiner?: string;
  founderIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type DealStage =
  | "sourced"
  | "screening"
  | "diligence"
  | "decision_ready"
  | "passed"
  | "invested";

export type SourcingRoute = "inbound" | "outbound";

// The per-application deal record in the Memory layer.
export interface DealRecord {
  id: string;
  founderId: string;
  companyId: string;
  route: SourcingRoute;
  channelId?: string; // SourcingChannel, if outbound-sourced
  stage: DealStage;
  diligenceDocId?: number; // diligence-service document id, once uploaded
  createdAt: string;
  updatedAt: string;
}

// ── Cold-start scoring (Novel Element 1) ────────────────────────────────

export type ProcessSignalType =
  | "shipping_cadence"
  | "completion_rate"
  | "critique_response"
  | "writing_depth"
  | "artifact_velocity";

export interface ProcessSignal {
  type: ProcessSignalType;
  value: number; // 0..1, normalized
  weight: number; // 0..1
  evidenceClaimId: string;
}

export type ScoreBasis = "process" | "identity" | "blended";

export interface ScoredInterval {
  score: number; // 0..100, midpoint
  low: number;
  high: number;
  basis: ScoreBasis;
  signalCount: number;
}

// ── 3-axis scorer — Founder / Market / Idea-vs-Market, never averaged ──

export type Trend = "up" | "down" | "flat";

export interface AxisScore {
  score: number; // 0..100
  low: number;
  high: number;
  trend: Trend;
  confidence: number; // 0..1
  basis: string; // short human-readable description of what drove this axis
}

export interface ThreeAxisScore {
  founder: AxisScore;
  market: AxisScore;
  ideaVsMarket: AxisScore;
  computedAt: string;
}

// ── Trust Score — per claim, uncertainty-decomposed (Novel Element 3) ──

export interface TrustScoreComponents {
  dataVolume: number; // 0..1 — how much corroborating data exists
  dataCleanliness: number; // 0..1 — how clean/parseable/unambiguous the source was
  signalAgreement: number; // 0..1 — how much independent sources agree
}

export type TrustLevel = "low" | "medium" | "high";

export interface TrustScore {
  claimId: string;
  confidence: number; // 0..1, derived from components — never a bare number in the UI without these
  components: TrustScoreComponents;
  level: TrustLevel;
}

// ── Agentic Traceability ────────────────────────────────────────────────

export interface TraceabilityEntry {
  id: string;
  dealId: string;
  conclusion: string; // the exact claim/score/flag being justified
  claimIds: string[];
  sourceUrls: string[];
  agent: string; // which agent/module produced this
  at: string; // ISO
  diligenceSignalType?: string; // if bridged to the diligence service's signal log (FOUNDER_MOMENTUM, etc.)
}

// ── Thesis Engine ───────────────────────────────────────────────────────

export interface ThesisConfig {
  name: string;
  sectors: string[];
  stageMin: "pre-seed" | "seed" | "series-a";
  stageMax: "pre-seed" | "seed" | "series-a";
  checkSizeUsd: number;
  mustHave: string[];
  niceToHave: string[];
}

// ── Sourcing channel as a scored entity (Novel Element 4) ──────────────

export type ChannelKind = "hackathon" | "accelerator" | "subreddit" | "arxiv_category" | "other";

export interface SourcingChannel {
  id: string;
  name: string;
  kind: ChannelKind;
  dealsSeen: number;
  dealsFunded: number;
  priorHitRate: number; // dealsFunded / dealsSeen, Beta-smoothed — see lib/scoring/channel-priors.ts
}

// ── Dealbreaker Scanner ─────────────────────────────────────────────────

export type DealbreakerSeverity = "critical" | "high" | "medium" | "low";

export interface DealbreakerFlag {
  id: string;
  dealId: string;
  type: string;
  severity: DealbreakerSeverity;
  message: string;
  sourceClaimId?: string;
}

// ── Investment Memo ──────────────────────────────────────────────────────

export type MandatoryMemoSection =
  | "company_snapshot"
  | "investment_hypotheses"
  | "swot"
  | "problem_and_product"
  | "traction_and_kpis";

export type OptionalMemoSection =
  | "team_and_history"
  | "technology_and_defensibility"
  | "market_sizing"
  | "competition"
  | "financials"
  | "cap_table"
  | "dd_log"
  | "exit_perspective";

export interface MemoGap {
  section: MandatoryMemoSection | OptionalMemoSection;
  field: string;
  note: string; // e.g. "Cap table: not disclosed"
}

export interface MemoSectionContent {
  section: MandatoryMemoSection | OptionalMemoSection;
  mandatory: boolean;
  rendered: boolean; // false if optional + no backing claims
  body: string;
  claimIds: string[];
}

export interface InvestmentMemo {
  id: string;
  dealId: string;
  sections: MemoSectionContent[];
  gaps: MemoGap[];
  generatedAt: string;
}
