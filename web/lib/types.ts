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
  | "diligence_engine"
  | "web_pulse"
  | "simulation"
  | "momentum_plan"; // derived from internal simulators (adversarial swarm, momentum engine)

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

// "applied" — a founder submitted a name/deck directly.
// "sourced" — we found them ourselves (GitHub/X/website/papers/patents).
export type SourcingRoute = "applied" | "sourced";

// The per-application deal record in the Memory layer.
export interface RedFlagSummary {
  score: number; // 0..100, from the diligence engine — NOT the axis scores, a separate risk-document scan
  trafficLight: "red" | "amber" | "green";
  verdict: string;
}

export interface ThesisFitSummary {
  fits: boolean;
  score: number; // 0..1, soft fit strength — ranks the queue, doesn't gate it
  reasons: string[]; // why it passed or failed each check, in plain language
}

export interface ValidatorFinding {
  check: string;
  passed: boolean;
  detail: string;
}

export interface DealRecord {
  id: string;
  founderId: string;
  companyId: string;
  route: SourcingRoute;
  channelId?: string; // SourcingChannel, if sourced (not applied)
  stage: DealStage;
  diligenceDocId?: number; // diligence-service document id, once uploaded
  redFlagScore?: RedFlagSummary;
  thesisFit?: ThesisFitSummary;
  validatorFindings?: ValidatorFinding[];
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

// ── Simulation + Momentum Planning ───────────────────────────────────────

export type SimulationStatus = "queued" | "running" | "succeeded" | "failed";

export interface SimulationScenario {
  title: string;
  likelihood: number; // 0..1
  upside: string;
  downside: string;
  turningPoints: string[];
  actions: string[];
  confidence: number; // 0..1
}

export interface SimulationFeedEvent {
  id: string;
  agent: string;
  role: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number; // 0..1
  text: string;
  url?: string;
  at: string;
}

export interface SimulationRecord {
  id: string;
  dealId?: string;
  topic: string;
  status: SimulationStatus;
  provider: "mock" | "swarm";
  scenarios: SimulationScenario[];
  feed: SimulationFeedEvent[];
  activeAgents: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Momentum Plan ────────────────────────────────────────────────────────
// Not a generic GTM/marketing plan — a short, evidence-driven action list
// aimed at closing whichever cold-start process signal (see ProcessSignalType)
// is weakest or least-evidenced for a given founder, blended with one or two
// live external signals. Horizon and content are both derived from the
// founder's own claim evidence, not a fixed template.

export type MomentumActionChannel = "linkedin" | "x" | "email" | "community" | "content" | "product" | "research";

export interface MomentumAction {
  id: string;
  title: string;
  channel: MomentumActionChannel;
  rationale: string;
  expectedOutcome: string;
  dueAt?: string;
  linkedSignal?: ProcessSignalType; // which cold-start signal this action targets, if any
  sourceIds?: string[]; // trace back to evidence claims/sources
}

export interface MomentumPlan {
  id: string;
  dealId?: string;
  summary: string;
  horizonDays: number; // derived from evidence thinness, not fixed
  actions: MomentumAction[];
  generatedAt: string;
  source: "mock" | "momentum-engine";
}

// ── Discover — active candidate search (not yet a scored deal) ─────────

export interface DiscoverFilters {
  industry?: string; // keyword, e.g. "robotics", "energy"
  geography?: string; // e.g. "San Francisco"
  university?: string; // e.g. "MIT"
}

// A candidate is deliberately NOT a Founder/DealRecord — surfacing someone
// in a filter search creates no persistent record and runs no scoring.
// Nothing happens to a candidate's data until a human explicitly chooses to
// screen them (see docs/ETHICS.md — no shadow profiles from passive search).
export interface Candidate {
  id: string; // ephemeral, search-result-scoped — not a Memory id
  name: string;
  headline: string; // why this hit is relevant, in one line
  sourceKind: SourceKind;
  sourceUrl: string;
  suggestedCompanyName?: string;
  suggestedGithubUsername?: string;
  matchedFilters: DiscoverFilters;
}

// A founder event — hackathon, pitch day, demo day — also ephemeral, same
// no-persistence rule as Candidate. Lets a VC see what's happening in their
// vertical/geography before founders from it ever get sourced individually.
export interface FounderEvent {
  id: string;
  title: string;
  location: string; // "Online" is a real, common value — not a bug
  url: string;
  submissionDates: string;
  themes: string[];
  organizer?: string;
}
