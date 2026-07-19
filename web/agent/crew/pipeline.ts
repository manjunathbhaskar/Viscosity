// Sourcing → Screening orchestrator. Converges an applied deal (deck + name
// minimum) and a sourced deal (founder-enrichment.ts: GitHub/launches/website)
// into one Screening step: gather evidence, score, check dealbreakers, check
// thesis fit, write to Memory, log for self-validation.

import { newId } from "@/lib/memory/schema";
import { updateMemory } from "@/lib/memory/store";
import { initFounderScoreRecord, strengthenFounderScore } from "@/lib/memory/founder-score";
import { classifyClaim, computeThreeAxisScore } from "@/lib/scoring/three-axis";
import { computeTrustScoresForSubject } from "@/lib/scoring/trust-score";
import { enrichFounder } from "@/agent/tools/founder-enrichment";
import { runWarroom, scanDealbreakers } from "@/lib/diligence-bridge";
import { buildTraceabilityEntry, traceAndEmitDiligenceSignal } from "@/lib/traceability";
import { defaultThesis, evaluateThesisFit, type ThesisFitResult } from "@/lib/thesis-engine";
import { runValidatorAgent } from "@/lib/validator-agent";
import { logPrediction } from "@/lib/self-validation";
import type {
  Claim,
  DealRecord,
  DealbreakerFlag,
  Founder,
  Source,
  Startup,
  ThreeAxisScore,
  TraceabilityEntry,
} from "@/lib/types";

export interface SourceDealInput {
  route: "applied" | "sourced";
  founderName: string;
  companyName: string;
  companyOneLiner?: string;
  githubUsername?: string;
  websiteUrl?: string;
  xHandle?: string;
  channelId?: string;
  deckMarkdown?: string; // applied route: deck + name minimum
}

export interface SourceDealResult {
  deal: DealRecord;
  founder: Founder;
  company: Startup;
  claims: Claim[];
  axisScore: ThreeAxisScore;
  dealbreakers: DealbreakerFlag[];
  thesisFit: ThesisFitResult;
  traceEntries: TraceabilityEntry[];
}

export async function sourceAndScreenDeal(input: SourceDealInput): Promise<SourceDealResult> {
  const now = new Date().toISOString();
  const founderId = newId("founder");
  const companyId = newId("company");
  const dealId = newId("deal");

  const founder: Founder = {
    id: founderId,
    name: input.founderName,
    companyIds: [companyId],
    sourceIds: [],
    createdAt: now,
    updatedAt: now,
  };
  const company: Startup = {
    id: companyId,
    name: input.companyName,
    oneLiner: input.companyOneLiner,
    founderIds: [founderId],
    createdAt: now,
    updatedAt: now,
  };

  // Outbound scan: GitHub, launches, website -> claims + a synthesized dossier
  // pushed into the diligence service's upload endpoint (works even with zero deck).
  const enrichment = await enrichFounder({
    founderId,
    founderName: input.founderName,
    companyName: input.companyName,
    githubUsername: input.githubUsername,
    websiteUrl: input.websiteUrl,
    xHandle: input.xHandle,
  });

  const claims: Claim[] = [...enrichment.claims];
  const sources: Source[] = [...enrichment.sources];

  // Applied route: deck + name minimum. Naive line-based claim extraction —
  // every substantive line becomes a claim tied to the deck source, so the
  // rest of the pipeline (scoring, trust, memo) treats applied and sourced
  // evidence identically.
  if (input.deckMarkdown) {
    const deckSource: Source = { id: newId("src"), url: `deck://${founderId}`, kind: "deck", fetchedAt: now, title: "Application deck" };
    sources.push(deckSource);
    const lines = input.deckMarkdown
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 12)
      .slice(0, 20);
    for (const line of lines) {
      claims.push({
        id: newId("claim"),
        subjectId: founderId,
        subjectType: "founder",
        text: line,
        sourceId: deckSource.id,
        confidence: 0.6,
        timestamp: now,
      });
    }
  }

  founder.sourceIds = sources.map((s) => s.id);

  // Diligence: Red Flag Score + Dealbreaker Scanner against the uploaded material.
  const docId = enrichment.upload.doc_id;
  const [warroom, dealbreakerScan] = await Promise.all([runWarroom(docId), scanDealbreakers(docId, enrichment.dossierMarkdown)]);

  const dealbreakers: DealbreakerFlag[] = dealbreakerScan.result.critical_findings.map((f) => ({
    id: newId("flag"),
    dealId,
    type: f.type,
    severity: f.severity.toLowerCase() as DealbreakerFlag["severity"],
    message: f.description,
  }));

  // Bucket claims per axis so the 3-axis scorer sees the right evidence for each.
  const founderClaims: Claim[] = [];
  const marketClaims: Claim[] = [];
  const ideaClaims: Claim[] = [];
  for (const c of claims) {
    const bucket = classifyClaim(c);
    if (bucket === "market") marketClaims.push(c);
    else if (bucket === "idea") ideaClaims.push(c);
    else founderClaims.push(c);
  }

  const axisScore = computeThreeAxisScore({ founderClaims, marketClaims, ideaFitClaims: ideaClaims });
  const trustScores = computeTrustScoresForSubject(founderId, claims, sources);

  const thesisFit = evaluateThesisFit(defaultThesis(), company, axisScore);
  const hasCriticalDealbreaker = dealbreakers.some((d) => d.severity === "critical");
  // A second, independent pass over the same evidence before anything ships —
  // catches internal contradictions the scoring math alone wouldn't flag.
  const validatorFindings = runValidatorAgent(claims, axisScore);

  const deal: DealRecord = {
    id: dealId,
    founderId,
    companyId,
    route: input.route,
    channelId: input.channelId,
    stage: thesisFit.fits && !hasCriticalDealbreaker ? "diligence" : "screening",
    diligenceDocId: docId,
    redFlagScore: {
      score: warroom.red_flags.score,
      trafficLight: warroom.red_flags.traffic_light,
      verdict: warroom.red_flags.verdict,
    },
    thesisFit: { fits: thesisFit.fits, score: thesisFit.score, reasons: thesisFit.reasons },
    validatorFindings,
    createdAt: now,
    updatedAt: now,
  };

  // Agentic Traceability — every axis conclusion cites the claims behind it;
  // the founder-momentum conclusion also bridges into the diligence service's signal log.
  const traceEntries: TraceabilityEntry[] = [
    buildTraceabilityEntry({ dealId, conclusion: `Founder axis: ${axisScore.founder.score} (${axisScore.founder.basis})`, agent: "three-axis-scorer", claims: founderClaims, sources }),
    buildTraceabilityEntry({ dealId, conclusion: `Market axis: ${axisScore.market.score} (${axisScore.market.basis})`, agent: "three-axis-scorer", claims: marketClaims, sources }),
    buildTraceabilityEntry({ dealId, conclusion: `Idea-vs-market axis: ${axisScore.ideaVsMarket.score} (${axisScore.ideaVsMarket.basis})`, agent: "three-axis-scorer", claims: ideaClaims, sources }),
  ];

  const momentumTrace = await traceAndEmitDiligenceSignal({
    dealId,
    conclusion: `Founder momentum score ${axisScore.founder.score}`,
    agent: "three-axis-scorer",
    claims: founderClaims,
    sources,
    signalType: "FOUNDER_MOMENTUM",
    sourceEntity: input.founderName,
    diligenceDocId: docId,
    strength: axisScore.founder.score / 100,
  });
  traceEntries.push(momentumTrace);

  if (ideaClaims.length > 0 && axisScore.ideaVsMarket.score >= 55) {
    const tractionTrace = await traceAndEmitDiligenceSignal({
      dealId,
      conclusion: `Traction signal: idea-vs-market axis ${axisScore.ideaVsMarket.score}`,
      agent: "three-axis-scorer",
      claims: ideaClaims,
      sources,
      signalType: "TRACTION_SIGNAL",
      sourceEntity: input.founderName,
      diligenceDocId: docId,
      strength: axisScore.ideaVsMarket.score / 100,
    });
    traceEntries.push(tractionTrace);
  }

  const contradicted = claims.filter((c) => (c.contradictedBy?.length ?? 0) > 0);
  for (const c of contradicted) {
    const t = await traceAndEmitDiligenceSignal({
      dealId,
      conclusion: `Contradiction on claim: ${c.text}`,
      agent: "trust-score",
      claims: [c],
      sources,
      signalType: "CONTRADICTION_FLAG",
      sourceEntity: input.founderName,
      diligenceDocId: docId,
      strength: 0.7,
    });
    traceEntries.push(t);
  }

  // Persist to the Memory layer — the only place this deal lives after the call returns.
  await updateMemory((m) => {
    m.founders.push(founder);
    m.companies.push(company);
    m.claims.push(...claims);
    m.sources.push(...sources);
    m.deals.push(deal);
    m.trustScores.push(...trustScores);
    m.dealbreakers.push(...dealbreakers);
    m.traceability.push(...traceEntries);

    const existingScore = m.founderScores.find((f) => f.founderId === founderId);
    if (existingScore) {
      const idx = m.founderScores.indexOf(existingScore);
      m.founderScores[idx] = strengthenFounderScore(existingScore, axisScore);
    } else {
      m.founderScores.push(initFounderScoreRecord(founderId, axisScore));
    }
  });

  // Novel Element 2 harness — logs the prediction now so it can be diffed
  // against real announced results later (see lib/self-validation.ts).
  await logPrediction(deal, input.founderName, input.companyName, axisScore).catch(() => {});

  return { deal, founder, company, claims, axisScore, dealbreakers, thesisFit, traceEntries };
}
