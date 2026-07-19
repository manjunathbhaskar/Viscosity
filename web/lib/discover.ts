// Candidate discovery — actively searches for NEW founders/researchers
// matching a filter (industry, geography, university) rather than only
// showing founders already sourced. Live-verified during development:
// GitHub's user search supports a `location:` qualifier directly
// (`q=robotics location:"San Francisco"` returned 282 real hits), and
// arXiv's `all:` field search combines a keyword and an affiliation-ish
// term in one query (`all:"MIT" AND all:"robotics"` returned real papers).
//
// Deliberately does NOT write anything to the Memory layer. A candidate is
// a throwaway search result — no persistent record exists, no scoring runs,
// until a human explicitly chooses to screen one (see docs/ETHICS.md). This
// is what keeps Discover from becoming a shadow database of everyone who
// ever matched a filter.

import type { Candidate, DiscoverFilters } from "@/lib/types";

const TIMEOUT_MS = 12_000;
const MAX_PER_SOURCE = 5;

function newCandidateId(): string {
  return `cand_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── GitHub ──────────────────────────────────────────────────────────────

interface GithubUserSummary {
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
}

async function searchGithubCandidates(filters: DiscoverFilters): Promise<Candidate[]> {
  try {
    const terms = [filters.industry].filter(Boolean) as string[];
    let query = terms.join(" ");
    if (filters.geography) query += ` location:"${filters.geography}"`;
    if (!query.trim()) return [];

    const token = process.env.GITHUB_TOKEN;
    const headers = { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) };

    const searchRes = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=${MAX_PER_SOURCE}`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!searchRes.ok) throw new Error(`${searchRes.status} searching GitHub users`);
    const searchData = await searchRes.json();
    const logins: string[] = Array.isArray(searchData.items) ? searchData.items.map((i: { login: string }) => i.login) : [];

    const profiles = await Promise.all(
      logins.map(async (login): Promise<GithubUserSummary | null> => {
        try {
          const res = await fetch(`https://api.github.com/users/${login}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
          if (!res.ok) return null;
          const u = await res.json();
          return { login, name: u.name ?? null, bio: u.bio ?? null, company: u.company ?? null, location: u.location ?? null, blog: u.blog ?? null };
        } catch {
          return null;
        }
      })
    );

    return profiles
      .filter((p): p is GithubUserSummary => p !== null)
      .map((p) => ({
        id: newCandidateId(),
        name: p.name ?? p.login,
        headline: p.bio ?? `${p.company ? `Works at ${p.company}` : "Active on GitHub"}${p.location ? ` — ${p.location}` : ""}`,
        sourceKind: "github" as const,
        sourceUrl: `https://github.com/${p.login}`,
        suggestedCompanyName: p.company ?? undefined,
        suggestedGithubUsername: p.login,
        matchedFilters: filters,
      }));
  } catch (err) {
    console.error("[discover:github]", err);
    return [];
  }
}

// ── arXiv ───────────────────────────────────────────────────────────────

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

async function searchArxivCandidates(filters: DiscoverFilters): Promise<Candidate[]> {
  if (!filters.industry && !filters.university) return [];
  try {
    const clauses: string[] = [];
    if (filters.industry) clauses.push(`all:"${filters.industry}"`);
    if (filters.university) clauses.push(`all:"${filters.university}"`);
    const query = clauses.join(" AND ");

    const res = await fetch(
      `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&max_results=${MAX_PER_SOURCE}&sortBy=submittedDate&sortOrder=descending`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    if (!res.ok) throw new Error(`${res.status} searching arXiv`);
    const xml = await res.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

    return entries.map((block) => {
      const title = extractTag(block, "title");
      const firstAuthor = block.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim() ?? "Unknown author";
      const linkMatch = block.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/);
      return {
        id: newCandidateId(),
        name: firstAuthor,
        headline: `Published "${title}"`,
        sourceKind: "paper" as const,
        sourceUrl: linkMatch ? linkMatch[1] : extractTag(block, "id"),
        matchedFilters: filters,
      };
    });
  } catch (err) {
    console.error("[discover:arxiv]", err);
    return [];
  }
}

// ── Mock ────────────────────────────────────────────────────────────────

async function mockDiscoverCandidates(filters: DiscoverFilters): Promise<Candidate[]> {
  const { mockDiscoverHits } = await import("@/data/fixtures/discover");
  return mockDiscoverHits(filters);
}

export async function discoverCandidates(filters: DiscoverFilters): Promise<Candidate[]> {
  if (!filters.industry && !filters.geography && !filters.university) return [];
  if (process.env.VCBRAIN_MOCK === "1") return mockDiscoverCandidates(filters);

  const [githubHits, arxivHits] = await Promise.all([searchGithubCandidates(filters), searchArxivCandidates(filters)]);
  return [...githubHits, ...arxivHits];
}
