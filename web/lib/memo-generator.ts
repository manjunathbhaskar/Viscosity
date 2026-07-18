// Investment Memo generator. Only 5 sections are mandatory: Company snapshot,
// Investment hypotheses, SWOT, Problem & product, Traction & KPIs — anything
// else is optional and renders only when backing claims actually exist.
// Missing-but-expected data is flagged explicitly via the diligence engine's
// absence-detection endpoint rather than fabricated.

import type {
  Claim,
  DealRecord,
  InvestmentMemo,
  MandatoryMemoSection,
  MemoGap,
  MemoSectionContent,
  OptionalMemoSection,
  Startup,
  ThreeAxisScore,
} from "@/lib/types";
import { detectAbsences, type AbsenceResult } from "@/lib/diligence-bridge";
import { newId } from "@/lib/memory/schema";

const MANDATORY: MandatoryMemoSection[] = [
  "company_snapshot",
  "investment_hypotheses",
  "swot",
  "problem_and_product",
  "traction_and_kpis",
];

function claimsMentioning(claims: Claim[], pattern: RegExp): Claim[] {
  return claims.filter((c) => pattern.test(c.text));
}

function renderCompanySnapshot(company: Startup, deal: DealRecord): MemoSectionContent {
  const body = [
    `**${company.name}**${company.oneLiner ? ` — ${company.oneLiner}` : ""}`,
    company.website ? `Website: ${company.website}` : "Website: not disclosed",
    `Route: ${deal.route}`,
    `Stage: ${deal.stage.replace("_", " ")}`,
  ].join("\n");
  return { section: "company_snapshot", mandatory: true, rendered: true, body, claimIds: [] };
}

function renderInvestmentHypotheses(axisScore: ThreeAxisScore): MemoSectionContent {
  const body = [
    `Founder: ${axisScore.founder.score} (${axisScore.founder.low}-${axisScore.founder.high}) — ${axisScore.founder.basis}`,
    `Market: ${axisScore.market.score} (${axisScore.market.low}-${axisScore.market.high}) — ${axisScore.market.basis}`,
    `Idea-vs-Market: ${axisScore.ideaVsMarket.score} (${axisScore.ideaVsMarket.low}-${axisScore.ideaVsMarket.high}) — ${axisScore.ideaVsMarket.basis}`,
    "",
    "These three axes are reported independently and are never averaged into a single score.",
  ].join("\n");
  return { section: "investment_hypotheses", mandatory: true, rendered: true, body, claimIds: [] };
}

function renderSwot(claims: Claim[]): MemoSectionContent {
  const strengths = claimsMentioning(claims, /\b(shipped|paying customers?|retention|growing market|waitlist)\b/i);
  const weaknesses = claimsMentioning(claims, /\b(no users|churned|shrinking|saturated|unclear icp)\b/i);
  const body = [
    "**Strengths**",
    ...(strengths.length ? strengths.map((c) => `- ${c.text}`) : ["- (none evidenced yet)"]),
    "",
    "**Weaknesses**",
    ...(weaknesses.length ? weaknesses.map((c) => `- ${c.text}`) : ["- (none evidenced yet)"]),
    "",
    "**Opportunities / Threats** — see Market axis basis in Investment Hypotheses above; not separately evidenced at this stage.",
  ].join("\n");
  const claimIds = [...strengths, ...weaknesses].map((c) => c.id);
  return { section: "swot", mandatory: true, rendered: true, body, claimIds };
}

function renderProblemAndProduct(company: Startup, claims: Claim[]): MemoSectionContent {
  const relevant = claimsMentioning(claims, /\b(built|shipped|prototype|mvp|demo|launched)\b/i);
  const body = [
    company.oneLiner ?? "(no product description on file — see gap flags)",
    "",
    ...(relevant.length ? relevant.map((c) => `- ${c.text}`) : ["- No product/build evidence found yet."]),
  ].join("\n");
  return { section: "problem_and_product", mandatory: true, rendered: true, body, claimIds: relevant.map((c) => c.id) };
}

function renderTraction(claims: Claim[]): MemoSectionContent {
  const relevant = claimsMentioning(claims, /\b(paying customers?|users?|retention|points|stars|followers|launched)\b/i);
  const body = relevant.length
    ? relevant.map((c) => `- ${c.text}`).join("\n")
    : "No quantified traction evidence found yet — flagged as a gap, not fabricated.";
  return { section: "traction_and_kpis", mandatory: true, rendered: true, body, claimIds: relevant.map((c) => c.id) };
}

const OPTIONAL_MATCHERS: Record<OptionalMemoSection, RegExp> = {
  team_and_history: /\b(previously|co-founded|exited|alum|worked at)\b/i,
  technology_and_defensibility: /\b(patent|proprietary|defensib|moat|technical edge)\b/i,
  market_sizing: /\b(tam|sam|som|market size|billion|million users)\b/i,
  competition: /\b(competitor|competing with|versus|vs\.)\b/i,
  financials: /\b(revenue|arr|mrr|burn|runway)\b/i,
  cap_table: /\b(cap table|safe|equity split|ownership)\b/i,
  dd_log: /\b(diligence call|reference check|background check)\b/i,
  exit_perspective: /\b(acquirer|exit|ipo|strategic buyer)\b/i,
};

function renderOptionalSections(claims: Claim[]): MemoSectionContent[] {
  return (Object.keys(OPTIONAL_MATCHERS) as OptionalMemoSection[]).map((section) => {
    const relevant = claimsMentioning(claims, OPTIONAL_MATCHERS[section]);
    return {
      section,
      mandatory: false,
      rendered: relevant.length > 0,
      body: relevant.map((c) => `- ${c.text}`).join("\n"),
      claimIds: relevant.map((c) => c.id),
    };
  });
}

function absencesToGaps(absences: AbsenceResult): MemoGap[] {
  return absences.absent_topics.map((t) => ({
    section: mapAbsentTopicToSection(t.topic),
    field: t.topic,
    note: `${t.topic}: not disclosed`,
  }));
}

function mapAbsentTopicToSection(topic: string): MandatoryMemoSection | OptionalMemoSection {
  const lower = topic.toLowerCase();
  if (lower.includes("cap table")) return "cap_table";
  if (lower.includes("financ")) return "financials";
  if (lower.includes("litigation") || lower.includes("related party")) return "dd_log";
  if (lower.includes("ip") || lower.includes("license")) return "technology_and_defensibility";
  return "traction_and_kpis";
}

export async function generateInvestmentMemo(params: {
  deal: DealRecord;
  company: Startup;
  claims: Claim[];
  axisScore: ThreeAxisScore;
  diligenceDocIds: number[];
}): Promise<InvestmentMemo> {
  const mandatorySections: MemoSectionContent[] = [
    renderCompanySnapshot(params.company, params.deal),
    renderInvestmentHypotheses(params.axisScore),
    renderSwot(params.claims),
    renderProblemAndProduct(params.company, params.claims),
    renderTraction(params.claims),
  ];
  const optionalSections = renderOptionalSections(params.claims);

  const absences = params.diligenceDocIds.length > 0 ? await detectAbsences(params.diligenceDocIds) : null;
  const gaps = absences ? absencesToGaps(absences) : [];

  return {
    id: newId("memo"),
    dealId: params.deal.id,
    sections: [...mandatorySections, ...optionalSections],
    gaps,
    generatedAt: new Date().toISOString(),
  };
}

export function requiredSections(): MandatoryMemoSection[] {
  return MANDATORY;
}
