import { generateText } from "@/agent/crew/claude";
import { getMemory } from "@/lib/memory/store";
import { ensureDemoSeed } from "@/lib/memory/seed";

export async function generateBriefingText(dealId: string): Promise<string | null> {
  await ensureDemoSeed();
  const m = await getMemory();
  const deal = m.deals.find((d) => d.id === dealId);
  if (!deal) return null;

  const founder = m.founders.find((f) => f.id === deal.founderId);
  const company = m.companies.find((c) => c.id === deal.companyId);
  const scoreRecord = m.founderScores.find((s) => s.founderId === deal.founderId);
  const claims = m.claims.filter((c) => c.subjectId === deal.founderId).slice(0, 12);
  const dealbreakers = m.dealbreakers.filter((db) => db.dealId === deal.id);
  const sources = m.sources.filter((s) => founder?.sourceIds.includes(s.id));

  const context = JSON.stringify({
    founder: founder?.name,
    company: company?.name,
    oneLiner: company?.oneLiner,
    stage: deal.stage,
    route: deal.route,
    scores: scoreRecord?.latest,
    redFlagScore: deal.redFlagScore,
    thesisFit: deal.thesisFit,
    dealbreakers: dealbreakers.map((d) => d.message),
    topClaims: claims.map((c) => c.text),
  });

  const system = `You are a concise VC analyst giving a 30-second verbal briefing to a partner. Be direct, cite specific data points from the claims, and end with a clear recommendation or concern. Never fabricate data. Speak naturally as if in a partner meeting.`;
  const prompt = `Generate a spoken briefing for this deal. Keep it under 120 words. Include specific data points from the claims:\n${context}`;

  const briefing = await generateText(system, prompt, 512);
  if (briefing) return briefing;

  const scores = scoreRecord?.latest;
  const founderScore = scores?.founder?.score ?? "unknown";
  const marketScore = scores?.market?.score ?? "unknown";
  const fitScore = scores?.ideaVsMarket?.score ?? "unknown";
  const confidence = scores?.founder?.confidence
    ? `${Math.round(scores.founder.confidence * 100)}% confidence`
    : "";
  const interval = scores?.founder
    ? `interval ${scores.founder.low} to ${scores.founder.high}`
    : "";

  const rfFlag = deal.redFlagScore
    ? `Red flag score: ${deal.redFlagScore.score} out of 100, flagged ${deal.redFlagScore.trafficLight}. ${deal.redFlagScore.verdict}.`
    : "No material red flags found.";

  const dbSection = dealbreakers.length > 0
    ? `Dealbreakers flagged: ${dealbreakers.map((d) => d.message).join(". ")}.`
    : "Dealbreaker scan came back clean.";

  const claimSection = claims.length > 0
    ? `Key evidence: ${claims.slice(0, 4).map((c) => c.text).join(". ")}.`
    : "";

  const thesisFit = deal.thesisFit
    ? `Thesis fit: ${deal.thesisFit.fits ? "passes" : "does not pass"} at ${Math.round(deal.thesisFit.score * 100)}%.`
    : "";

  const sourceKinds = [...new Set(sources.map((s) => s.kind))].join(", ");

  return `Briefing on ${founder?.name ?? "this founder"} at ${company?.name ?? "their company"}. ${company?.oneLiner ?? ""}. Stage: ${deal.stage.replace("_", " ")}, route: ${deal.route}. Founder axis scores ${founderScore}, ${interval}, ${confidence}. Market axis: ${marketScore}. Idea versus market fit: ${fitScore}. ${thesisFit} ${rfFlag} ${dbSection} ${claimSection} Data sources: ${sourceKinds || "none yet"}.`;
}

export async function generateAnswerText(dealId: string, question: string): Promise<string | null> {
  await ensureDemoSeed();
  const m = await getMemory();
  const deal = m.deals.find((d) => d.id === dealId);
  if (!deal) return null;

  const founder = m.founders.find((f) => f.id === deal.founderId);
  const company = m.companies.find((c) => c.id === deal.companyId);
  const scoreRecord = m.founderScores.find((s) => s.founderId === deal.founderId);
  const claims = m.claims.filter((c) => c.subjectId === deal.founderId).slice(0, 15);
  const dealbreakers = m.dealbreakers.filter((db) => db.dealId === deal.id);
  const traceability = m.traceability.filter((t) => t.dealId === deal.id);

  const context = JSON.stringify({
    founder: founder?.name,
    company: company?.name,
    oneLiner: company?.oneLiner,
    stage: deal.stage,
    scores: scoreRecord?.latest,
    redFlagScore: deal.redFlagScore,
    thesisFit: deal.thesisFit,
    dealbreakers: dealbreakers.map((d) => ({ severity: d.severity, message: d.message })),
    claims: claims.map((c) => c.text),
    traceability: traceability.map((t) => t.conclusion),
  });

  const system = `You are a VC analyst assistant. Answer the investor's question concisely (2-3 sentences max) based only on the deal data provided. Cite specific claims or scores from the data. If the data does not contain the answer, say so directly. Speak naturally.`;
  const prompt = `Deal context:\n${context}\n\nInvestor question: ${question}`;

  const answer = await generateText(system, prompt, 256);
  if (answer) return answer;

  const relevantClaims = claims.filter((c) =>
    c.text.toLowerCase().includes(question.toLowerCase().split(" ").filter((w) => w.length > 3)[0] ?? "")
  );

  if (relevantClaims.length > 0) {
    return `For ${founder?.name ?? "this founder"}: ${relevantClaims.slice(0, 2).map((c) => c.text).join(". ")}. Their founder score is ${scoreRecord?.latest?.founder?.score ?? "not yet calculated"}, and ${dealbreakers.length > 0 ? `there are ${dealbreakers.length} dealbreakers flagged` : "no dealbreakers have been flagged"}.`;
  }

  return `For ${founder?.name ?? "this founder"} at ${company?.name ?? "their company"}: I have ${claims.length} evidence claims on file. Founder axis scores ${scoreRecord?.latest?.founder?.score ?? "N/A"}, market ${scoreRecord?.latest?.market?.score ?? "N/A"}. ${dealbreakers.length > 0 ? `${dealbreakers.length} dealbreaker(s) flagged: ${dealbreakers[0]?.message}` : "No dealbreakers detected"}. Ask me about their scores, red flags, or specific evidence.`;
}
