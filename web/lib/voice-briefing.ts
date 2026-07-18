import { generateText } from "@/agent/crew/claude";
import { getMemory } from "@/lib/memory/store";

export async function generateBriefingText(dealId: string): Promise<string | null> {
  const m = await getMemory();
  const deal = m.deals.find((d) => d.id === dealId);
  if (!deal) return null;

  const founder = m.founders.find((f) => f.id === deal.founderId);
  const company = m.companies.find((c) => c.id === deal.companyId);
  const scoreRecord = m.founderScores.find((s) => s.founderId === deal.founderId);
  const claims = m.claims.filter((c) => c.subjectId === deal.founderId).slice(0, 12);
  const dealbreakers = m.dealbreakers.filter((db) => db.dealId === deal.id);

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

  const system = `You are a concise VC analyst giving a 30-second verbal briefing to a partner. Be direct, cite specific data points, and end with a clear recommendation or concern. Never fabricate data. Speak naturally as if in a partner meeting.`;
  const prompt = `Generate a spoken briefing for this deal. Keep it under 100 words:\n${context}`;

  const briefing = await generateText(system, prompt, 512);

  if (briefing) return briefing;

  const scores = scoreRecord?.latest;
  const founderScore = scores?.founder?.score ?? "N/A";
  const marketScore = scores?.market?.score ?? "N/A";
  const rfFlag = deal.redFlagScore
    ? `Red flag score is ${deal.redFlagScore.score} out of 100, flagged ${deal.redFlagScore.trafficLight}.`
    : "";
  const dbCount = dealbreakers.length;

  return `${founder?.name ?? "This founder"} at ${company?.name ?? "their company"}${company?.oneLiner ? `, ${company.oneLiner}` : ""}. Currently at ${deal.stage.replace("_", " ")} stage via ${deal.route}. Founder axis scores ${founderScore}, market scores ${marketScore}. ${rfFlag} ${dbCount > 0 ? `${dbCount} dealbreaker${dbCount > 1 ? "s" : ""} flagged.` : "No dealbreakers detected."} ${claims.length > 0 ? `Key signal: ${claims[0].text}` : ""}`;
}

export async function generateAnswerText(dealId: string, question: string): Promise<string | null> {
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

  const system = `You are a VC analyst assistant. Answer the investor's question concisely (2-3 sentences max) based only on the deal data provided. If the data does not contain the answer, say so directly. Speak naturally.`;
  const prompt = `Deal context:\n${context}\n\nInvestor question: ${question}`;

  const answer = await generateText(system, prompt, 256);

  if (answer) return answer;

  return `Based on available data for ${founder?.name ?? "this founder"} at ${company?.name ?? "their company"}: the system does not have enough information to answer "${question}" with confidence. Try asking about the scoring basis, red flags, or claims evidence.`;
}
