// Trust Score — per claim, with a decomposed confidence, never a bare number.
// dataVolume / dataCleanliness / signalAgreement stay visible in the UI as
// independently-capped sub-scores rather than collapsing into one 0-100
// number — the decomposition is the point, applied here to arbitrary
// founder/company claims.

import type { Claim, Source, TrustLevel, TrustScore, TrustScoreComponents } from "@/lib/types";

// Cleanliness prior per source kind — diligence-engine-derived and primary
// documents (patents, papers) are cleaner than freeform web/profile text.
const SOURCE_CLEANLINESS: Record<Source["kind"], number> = {
  diligence_engine: 0.9,
  patent: 0.9,
  paper: 0.85,
  deck: 0.75,
  github: 0.8,
  accelerator: 0.75,
  launch: 0.65,
  hackathon: 0.65,
  interview: 0.6,
  public_profile: 0.55,
  web: 0.5,
};

function findCorroborating(claim: Claim, allClaims: Claim[]): Claim[] {
  return allClaims.filter(
    (c) =>
      c.id !== claim.id &&
      c.subjectId === claim.subjectId &&
      c.subjectType === claim.subjectType &&
      !claim.contradictedBy?.includes(c.id) &&
      similar(c.text, claim.text)
  );
}

// Cheap lexical overlap — good enough to detect "two sources say the same
// thing" without pulling in an embedding model for a hackathon-grade demo.
function similar(a: string, b: string): boolean {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  if (wa.size === 0 || wb.size === 0) return false;
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  return overlap / Math.min(wa.size, wb.size) > 0.4;
}

export function computeTrustScore(claim: Claim, allClaims: Claim[], sources: Source[]): TrustScore {
  const source = sources.find((s) => s.id === claim.sourceId);
  const corroborating = findCorroborating(claim, allClaims);
  const contradicting = claim.contradictedBy?.length ?? 0;

  const dataVolume = Math.min(1, corroborating.length / 3); // 3+ independent sources = full volume
  const dataCleanliness = source ? SOURCE_CLEANLINESS[source.kind] : 0.4;
  const totalOpinions = corroborating.length + contradicting;
  const signalAgreement = totalOpinions === 0 ? 0.5 : corroborating.length / (totalOpinions + 1);

  const components: TrustScoreComponents = { dataVolume, dataCleanliness, signalAgreement };

  // Weighted, not averaged blindly: agreement matters most (a contradicted
  // claim from a clean source is still a red flag), volume next, cleanliness least.
  const confidence =
    0.45 * signalAgreement + 0.3 * dataVolume + 0.25 * dataCleanliness;

  const level: TrustLevel = confidence >= 0.7 ? "high" : confidence >= 0.4 ? "medium" : "low";

  return { claimId: claim.id, confidence: Math.round(confidence * 100) / 100, components, level };
}

export function computeTrustScoresForSubject(
  subjectId: string,
  allClaims: Claim[],
  sources: Source[]
): TrustScore[] {
  return allClaims.filter((c) => c.subjectId === subjectId).map((c) => computeTrustScore(c, allClaims, sources));
}
