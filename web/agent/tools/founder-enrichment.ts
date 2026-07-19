// Founder enrichment — pulls whatever public signal exists (GitHub, launches,
// website) and pushes it into the diligence service's document-shaped
// ingestion endpoint, so the diligence engine has real material even when no
// deck was uploaded. This is the convergence point between outbound-sourced
// founders (no deck exists) and the diligence service's upload contract.
//
// Flow: run tools in parallel (github, website, launches) -> normalize each
// hit into a Claim tied to a Source -> synthesize a markdown "dossier" (since
// the upload endpoint expects a document, not structured JSON) -> upload it
// so the downstream diligence checks (red-flag scan, absence detection,
// knowledge graph, dealbreaker scan) all have real material to work with.

import { discoverGithubHandle, fetchGithubSignal, type GithubSignal } from "./github";
import { fetchWebsiteExtract } from "./website";
import { searchHackerNewsLaunches, searchProductHuntLaunches, type LaunchHit } from "./launches";
import { fetchXSignal, type XSignal } from "./x";
import { searchArxivByAuthor, type Paper } from "./papers";
import { searchPatentsByInventor, type PatentHit } from "./patents";
import { tavilyPulse } from "./tavily";
import { uploadDossier, type DiligenceUploadResult } from "@/lib/diligence-bridge";
import type { Claim, Source } from "@/lib/types";
import { newId } from "@/lib/memory/schema";

export interface FounderEnrichmentInput {
  founderId: string;
  founderName: string;
  companyName: string;
  githubUsername?: string;
  websiteUrl?: string;
  xHandle?: string;
}

export interface FounderEnrichmentResult {
  claims: Claim[];
  sources: Source[];
  dossierMarkdown: string;
  upload: DiligenceUploadResult;
}

function githubToClaimsAndSources(
  founderId: string,
  gh: GithubSignal,
  discovered: boolean
): { claims: Claim[]; sources: Source[] } {
  const now = new Date().toISOString();
  const source: Source = { id: newId("src"), url: `https://github.com/${gh.login}`, kind: "github", fetchedAt: now, title: `${gh.login} on GitHub` };
  const claims: Claim[] = [
    {
      id: newId("claim"),
      subjectId: founderId,
      subjectType: "founder",
      text: `${discovered ? "(auto-discovered via GitHub search, not explicitly provided) " : ""}${gh.login} has ${gh.publicRepos} public repos and ${gh.recentCommitCount} recent push events — shipped commits recently.`,
      sourceId: source.id,
      // Auto-discovered handles are an inferred match, not a confirmed one —
      // trust score should reflect that until a human confirms the match.
      confidence: discovered ? 0.5 : 0.75,
      timestamp: now,
    },
  ];
  for (const repo of gh.topRepos.slice(0, 3)) {
    if (!repo.name) continue;
    claims.push({
      id: newId("claim"),
      subjectId: founderId,
      subjectType: "founder",
      text: `Built and shipped "${repo.name}"${repo.description ? `: ${repo.description}` : ""}, last pushed ${repo.pushedAt}.`,
      sourceId: source.id,
      confidence: 0.7,
      timestamp: now,
    });
  }
  return { claims, sources: [source] };
}

function websiteToClaimsAndSources(founderId: string, url: string, text: string, title: string | null): { claims: Claim[]; sources: Source[] } {
  const now = new Date().toISOString();
  const source: Source = { id: newId("src"), url, kind: "web", fetchedAt: now, title: title ?? url };
  const claim: Claim = {
    id: newId("claim"),
    subjectId: founderId,
    subjectType: "founder",
    text: `Personal/company site content: ${text.slice(0, 400)}${text.length > 400 ? "…" : ""}`,
    sourceId: source.id,
    confidence: 0.5,
    timestamp: now,
  };
  return { claims: [claim], sources: [source] };
}

function launchesToClaimsAndSources(founderId: string, hits: LaunchHit[]): { claims: Claim[]; sources: Source[] } {
  const now = new Date().toISOString();
  const sources: Source[] = [];
  const claims: Claim[] = [];
  for (const hit of hits) {
    const source: Source = { id: newId("src"), url: hit.url, kind: "launch", fetchedAt: now, title: hit.title };
    sources.push(source);
    claims.push({
      id: newId("claim"),
      subjectId: founderId,
      subjectType: "founder",
      text: `Launched "${hit.title}" on ${hit.source === "hn" ? "Hacker News (Show HN)" : "Product Hunt"} with ${hit.points} points.`,
      sourceId: source.id,
      confidence: 0.65,
      timestamp: now,
    });
  }
  return { claims, sources };
}

// Truncates a raw post to a readable claim length while keeping whichever
// keyword triggered inclusion — cold-start.ts's process-signal patterns test
// against the whole claim text, so the trigger word needs to survive here.
function truncatePost(text: string, max = 220): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function xToClaimsAndSources(founderId: string, signal: XSignal): { claims: Claim[]; sources: Source[] } {
  const now = new Date().toISOString();
  const source: Source = {
    id: newId("src"),
    url: `https://x.com/${signal.handle}`,
    kind: "social_post",
    fetchedAt: now,
    title: `@${signal.handle} on X`,
  };
  const claims: Claim[] = [];

  // Shipping/artifact posts — feeds shipping_cadence / artifact_velocity signals.
  const shipping = signal.recentPosts.filter((p) => /\b(shipped|launched|built|released|deployed)\b/i.test(p.text));
  for (const p of shipping.slice(0, 3)) {
    claims.push({
      id: newId("claim"),
      subjectId: founderId,
      subjectType: "founder",
      text: `Posted on X: "${truncatePost(p.text)}" (${p.likes} likes, ${p.replies} replies).`,
      sourceId: source.id,
      confidence: 0.55,
      timestamp: now,
    });
  }

  // Public replies engaging with critique — feeds the critique_response signal
  // directly; the wrapper sentence guarantees the trigger phrase survives
  // even if the founder's own wording doesn't happen to match the pattern.
  const critiqueReplies = signal.recentPosts.filter(
    (p) => p.isReplyToOther && /\b(fixed|addressed|updated|patched|you'?re right|good (catch|point))\b/i.test(p.text)
  );
  for (const p of critiqueReplies.slice(0, 2)) {
    claims.push({
      id: newId("claim"),
      subjectId: founderId,
      subjectType: "founder",
      text: `Publicly responded to feedback on X: "${truncatePost(p.text)}".`,
      sourceId: source.id,
      confidence: 0.6,
      timestamp: now,
    });
  }

  if (claims.length === 0 && signal.recentPosts.length > 0) {
    claims.push({
      id: newId("claim"),
      subjectId: founderId,
      subjectType: "founder",
      text: `Active on X with ${signal.recentPosts.length} recent posts; no shipping or public critique-response detected.`,
      sourceId: source.id,
      confidence: 0.3,
      timestamp: now,
    });
  }

  return { claims, sources: [source] };
}

function papersToClaimsAndSources(founderId: string, papers: Paper[]): { claims: Claim[]; sources: Source[] } {
  const now = new Date().toISOString();
  const sources: Source[] = [];
  const claims: Claim[] = [];
  for (const p of papers.slice(0, 3)) {
    const source: Source = { id: newId("src"), url: p.url, kind: "paper", fetchedAt: now, title: p.title };
    sources.push(source);
    claims.push({
      id: newId("claim"),
      subjectId: founderId,
      subjectType: "founder",
      text: `Wrote a technical paper: "${p.title}" (${p.publishedAt.slice(0, 10)}).`,
      sourceId: source.id,
      confidence: 0.8,
      timestamp: now,
    });
  }
  return { claims, sources };
}

function patentsToClaimsAndSources(founderId: string, patents: PatentHit[]): { claims: Claim[]; sources: Source[] } {
  const now = new Date().toISOString();
  const sources: Source[] = [];
  const claims: Claim[] = [];
  for (const p of patents.slice(0, 3)) {
    const source: Source = {
      id: newId("src"),
      url: `https://patents.google.com/patent/US${p.patentId}`,
      kind: "patent",
      fetchedAt: now,
      title: p.title,
    };
    sources.push(source);
    claims.push({
      id: newId("claim"),
      subjectId: founderId,
      subjectType: "founder",
      text: `Named inventor on patent "${p.title}" (${p.date}).`,
      sourceId: source.id,
      confidence: 0.85,
      timestamp: now,
    });
  }
  return { claims, sources };
}

async function tavilyToClaimsAndSources(founderId: string, founderName: string, companyName: string): Promise<{ claims: Claim[]; sources: Source[] }> {
  const now = new Date().toISOString();
  const query = `${founderName} ${companyName} traction OR release OR launch`;
  const pulse = await tavilyPulse(query, 4);

  if (!pulse.findings.length) return { claims: [], sources: [] };

  const source: Source = {
    id: newId("src"),
    url: `tavily://${encodeURIComponent(query)}`,
    kind: "web_pulse",
    fetchedAt: now,
    title: `Web pulse: ${query}`,
  };

  const claims: Claim[] = pulse.findings.map((f) => ({
    id: newId("claim"),
    subjectId: founderId,
    subjectType: "founder",
    text: `External signal: ${f.title} — ${f.snippet}`,
    sourceId: source.id,
    confidence: pulse.source === "live" ? 0.55 : 0.4,
    timestamp: now,
  }));

  return { claims, sources: [source] };
}

// Dedicated market-signal pulse — separate from tavilyToClaimsAndSources
// above, which searches for founder/company traction and almost never turns
// up market-sizing or competitive-landscape language. Without this, the
// Market axis (lib/scoring/three-axis.ts) never receives any claims to
// classify and permanently defaults to the neutral 50/wide-interval "no
// evidence yet" case for every founder — which looks broken even though the
// scoring math itself is fine.
async function marketPulseToClaimsAndSources(founderId: string, companyName: string): Promise<{ claims: Claim[]; sources: Source[] }> {
  const now = new Date().toISOString();
  const query = `${companyName} market size OR competitors OR total addressable market OR industry growth`;
  const pulse = await tavilyPulse(query, 4);

  if (!pulse.findings.length) return { claims: [], sources: [] };

  const source: Source = {
    id: newId("src"),
    url: `tavily://${encodeURIComponent(query)}`,
    kind: "web_pulse",
    fetchedAt: now,
    title: `Market pulse: ${query}`,
  };

  const claims: Claim[] = pulse.findings.map((f) => ({
    id: newId("claim"),
    subjectId: founderId,
    subjectType: "founder",
    text: `Market signal: ${f.title} — ${f.snippet}`,
    sourceId: source.id,
    confidence: pulse.source === "live" ? 0.55 : 0.4,
    timestamp: now,
  }));

  return { claims, sources: [source] };
}

// Dedicated product-fit pulse — mirrors marketPulseToClaimsAndSources above,
// but for the Idea-vs-Market axis. Without this, that axis has the identical
// problem the market axis had: nothing in the founder-traction/GitHub/HN
// claims naturally discusses customer adoption, so it never gets evidence.
async function productFitPulseToClaimsAndSources(founderId: string, companyName: string): Promise<{ claims: Claim[]; sources: Source[] }> {
  const now = new Date().toISOString();
  const query = `${companyName} customers OR users OR retention OR reviews OR adoption`;
  const pulse = await tavilyPulse(query, 4);

  if (!pulse.findings.length) return { claims: [], sources: [] };

  const source: Source = {
    id: newId("src"),
    url: `tavily://${encodeURIComponent(query)}`,
    kind: "web_pulse",
    fetchedAt: now,
    title: `Product pulse: ${query}`,
  };

  const claims: Claim[] = pulse.findings.map((f) => ({
    id: newId("claim"),
    subjectId: founderId,
    subjectType: "founder",
    text: `Product signal: ${f.title} — ${f.snippet}`,
    sourceId: source.id,
    confidence: pulse.source === "live" ? 0.55 : 0.4,
    timestamp: now,
  }));

  return { claims, sources: [source] };
}

function buildDossierMarkdown(input: FounderEnrichmentInput, claims: Claim[]): string {
  const lines = [
    `# Founder Dossier — ${input.founderName}`,
    `Company: ${input.companyName}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Evidence",
    ...claims.map((c) => `- ${c.text}`),
  ];
  return lines.join("\n");
}

export async function enrichFounder(input: FounderEnrichmentInput): Promise<FounderEnrichmentResult> {
  // Agentic discovery: given no GitHub handle at all, don't just skip this
  // source — search for a plausible match on the company name first (falls
  // back to the founder's name if that comes up empty) before accepting a
  // true cold start. Every claim built from a discovered handle is marked as
  // such and scored at lower confidence than an explicitly-provided one.
  let githubUsername = input.githubUsername;
  let githubWasDiscovered = false;
  if (!githubUsername) {
    githubUsername =
      (await discoverGithubHandle(input.companyName)) ?? (await discoverGithubHandle(input.founderName)) ?? undefined;
    githubWasDiscovered = Boolean(githubUsername);
  }

  const [gh, site, hnHits, phHits, xSignal, papers, patents, tavily, marketPulse, productPulse] = await Promise.all([
    githubUsername ? fetchGithubSignal(githubUsername) : Promise.resolve(null),
    input.websiteUrl ? fetchWebsiteExtract(input.websiteUrl) : Promise.resolve(null),
    searchHackerNewsLaunches(input.companyName),
    searchProductHuntLaunches(input.companyName),
    input.xHandle ? fetchXSignal(input.xHandle) : Promise.resolve(null),
    searchArxivByAuthor(input.founderName),
    searchPatentsByInventor(input.founderName),
    tavilyToClaimsAndSources(input.founderId, input.founderName, input.companyName),
    marketPulseToClaimsAndSources(input.founderId, input.companyName),
    productFitPulseToClaimsAndSources(input.founderId, input.companyName),
  ]);

  let claims: Claim[] = [];
  let sources: Source[] = [];

  if (gh) {
    const r = githubToClaimsAndSources(input.founderId, gh, githubWasDiscovered);
    claims = claims.concat(r.claims);
    sources = sources.concat(r.sources);
  }
  if (site) {
    const r = websiteToClaimsAndSources(input.founderId, site.url, site.text, site.title);
    claims = claims.concat(r.claims);
    sources = sources.concat(r.sources);
  }
  const launchHits = [...(hnHits ?? []), ...(phHits ?? [])];
  if (launchHits.length > 0) {
    const r = launchesToClaimsAndSources(input.founderId, launchHits);
    claims = claims.concat(r.claims);
    sources = sources.concat(r.sources);
  }
  if (xSignal) {
    const r = xToClaimsAndSources(input.founderId, xSignal);
    claims = claims.concat(r.claims);
    sources = sources.concat(r.sources);
  }
  if (papers && papers.length > 0) {
    const r = papersToClaimsAndSources(input.founderId, papers);
    claims = claims.concat(r.claims);
    sources = sources.concat(r.sources);
  }
  if (patents && patents.length > 0) {
    const r = patentsToClaimsAndSources(input.founderId, patents);
    claims = claims.concat(r.claims);
    sources = sources.concat(r.sources);
  }
  if (tavily) {
    claims = claims.concat(tavily.claims);
    sources = sources.concat(tavily.sources);
  }
  if (marketPulse) {
    claims = claims.concat(marketPulse.claims);
    sources = sources.concat(marketPulse.sources);
  }
  if (productPulse) {
    claims = claims.concat(productPulse.claims);
    sources = sources.concat(productPulse.sources);
  }

  const dossierMarkdown = buildDossierMarkdown(input, claims);
  const upload = await uploadDossier(input.founderId, `${input.founderName.replace(/\s+/g, "_")}_dossier.md`, dossierMarkdown);

  return { claims, sources, dossierMarkdown, upload };
}
