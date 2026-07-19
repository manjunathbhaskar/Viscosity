// Tavily (a.k.a. Travily) web pulse — optional live search.
// Safe fallback: deterministic mock when VCBRAIN_MOCK=1 or key missing.

export interface TavilyFinding {
  title: string;
  url: string;
  snippet: string;
  relevance: number; // 0..1
}

export interface TavilyPulse {
  query: string;
  findings: TavilyFinding[];
  fetchedAt: string;
  source: "mock" | "live";
}

const DEFAULT_FINDINGS: TavilyFinding[] = [
  {
    title: "Founder momentum: shipping cadence visible on GitHub",
    url: "https://example.com/github-shipping-cadence",
    snippet: "Recent commits and release notes show weekly ship velocity and responsive issue handling.",
    relevance: 0.86,
  },
  {
    title: "Market chatter: buyer pain around outbound noise",
    url: "https://example.com/buyer-noise-fatigue",
    snippet: "Prospects report lower reply rates and reward creators who engage before outreach.",
    relevance: 0.79,
  },
  {
    title: "Competitive signal: new entrant focusing on warm intros",
    url: "https://example.com/warm-intro-platform",
    snippet: "A seed-stage competitor positions around pre-outreach familiarity building.",
    relevance: 0.71,
  },
];

export async function tavilyPulse(query: string, maxResults = 5): Promise<TavilyPulse> {
  const fetchedAt = new Date().toISOString();
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey || process.env.VCBRAIN_MOCK === "1") {
    return { query, findings: DEFAULT_FINDINGS.slice(0, maxResults), fetchedAt, source: "mock" };
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: "advanced",
        include_answer: false,
        include_raw_content: false,
        auto_parameters: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`Tavily ${res.status}`);
    const data = await res.json();
    const findings: TavilyFinding[] = Array.isArray(data.results)
      ? data.results.slice(0, maxResults).map((r: any) => ({
          title: r.title ?? r.url ?? "",
          url: r.url ?? "",
          snippet: r.content ?? r.description ?? "",
          relevance: typeof r.score === "number" ? Math.max(0, Math.min(1, r.score)) : 0.5,
        }))
      : DEFAULT_FINDINGS.slice(0, maxResults);

    return { query, findings, fetchedAt, source: "live" };
  } catch (err) {
    console.error("[tavily]", err);
    return { query, findings: DEFAULT_FINDINGS.slice(0, maxResults), fetchedAt, source: "mock" };
  }
}
