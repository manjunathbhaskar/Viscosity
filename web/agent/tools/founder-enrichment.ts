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

import { fetchGithubSignal, type GithubSignal } from "./github";
import { fetchWebsiteExtract } from "./website";
import { searchHackerNewsLaunches, searchProductHuntLaunches, type LaunchHit } from "./launches";
import { uploadDossier, type DiligenceUploadResult } from "@/lib/diligence-bridge";
import type { Claim, Source } from "@/lib/types";
import { newId } from "@/lib/memory/schema";

export interface FounderEnrichmentInput {
  founderId: string;
  founderName: string;
  companyName: string;
  githubUsername?: string;
  websiteUrl?: string;
}

export interface FounderEnrichmentResult {
  claims: Claim[];
  sources: Source[];
  dossierMarkdown: string;
  upload: DiligenceUploadResult;
}

function githubToClaimsAndSources(founderId: string, gh: GithubSignal): { claims: Claim[]; sources: Source[] } {
  const now = new Date().toISOString();
  const source: Source = { id: newId("src"), url: `https://github.com/${gh.login}`, kind: "github", fetchedAt: now, title: `${gh.login} on GitHub` };
  const claims: Claim[] = [
    {
      id: newId("claim"),
      subjectId: founderId,
      subjectType: "founder",
      text: `${gh.login} has ${gh.publicRepos} public repos and ${gh.recentCommitCount} recent push events — shipped commits recently.`,
      sourceId: source.id,
      confidence: 0.75,
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
  const [gh, site, hnHits, phHits] = await Promise.all([
    input.githubUsername ? fetchGithubSignal(input.githubUsername) : Promise.resolve(null),
    input.websiteUrl ? fetchWebsiteExtract(input.websiteUrl) : Promise.resolve(null),
    searchHackerNewsLaunches(input.companyName),
    searchProductHuntLaunches(input.companyName),
  ]);

  let claims: Claim[] = [];
  let sources: Source[] = [];

  if (gh) {
    const r = githubToClaimsAndSources(input.founderId, gh);
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

  const dossierMarkdown = buildDossierMarkdown(input, claims);
  const upload = await uploadDossier(input.founderId, `${input.founderName.replace(/\s+/g, "_")}_dossier.md`, dossierMarkdown);

  return { claims, sources, dossierMarkdown, upload };
}
