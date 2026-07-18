// Launch-signal tool — Hacker News "Show HN" search (free, no key, via HN
// Algolia API) plus an optional Product Hunt lookup guarded by PRODUCTHUNT_TOKEN
// (key-guard pattern: absent key -> null, never a network attempt).

const TIMEOUT_MS = 10_000;

export interface LaunchHit {
  source: "hn" | "producthunt";
  title: string;
  url: string;
  points: number;
  createdAt: string;
}

export async function searchHackerNewsLaunches(query: string): Promise<LaunchHit[] | null> {
  if (process.env.VCBRAIN_MOCK === "1") {
    const { mockLaunchHits } = await import("@/data/fixtures/founders");
    return mockLaunchHits(query);
  }
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=show_hn`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    if (!res.ok) throw new Error(`${res.status} searching HN for ${query}`);
    const data = await res.json();
    const hits = Array.isArray(data.hits) ? data.hits : [];
    return hits.slice(0, 5).map((h: Record<string, unknown>) => ({
      source: "hn" as const,
      title: String(h.title ?? ""),
      url: String(h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`),
      points: Number(h.points ?? 0),
      createdAt: String(h.created_at ?? ""),
    }));
  } catch (err) {
    console.error("[launches:hn]", err);
    return null;
  }
}

export async function searchProductHuntLaunches(query: string): Promise<LaunchHit[] | null> {
  const token = process.env.PRODUCTHUNT_TOKEN;
  if (!token || process.env.VCBRAIN_MOCK === "1") return null;
  try {
    const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        query: `query { posts(first: 5, order: VOTES, name: "${query.replace(/"/g, "")}") { edges { node { name url votesCount createdAt } } } }`,
      }),
    });
    if (!res.ok) throw new Error(`${res.status} querying Product Hunt for ${query}`);
    const data = await res.json();
    const edges = data?.data?.posts?.edges ?? [];
    return edges.map((e: { node: Record<string, unknown> }) => ({
      source: "producthunt" as const,
      title: String(e.node.name ?? ""),
      url: String(e.node.url ?? ""),
      points: Number(e.node.votesCount ?? 0),
      createdAt: String(e.node.createdAt ?? ""),
    }));
  } catch (err) {
    console.error("[launches:producthunt]", err);
    return null;
  }
}
