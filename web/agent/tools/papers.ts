// arXiv papers tool — free, unauthenticated, live-verified (see the curl
// trace in project history: a real author-search query against
// export.arxiv.org returned a real Atom feed during development). Covers
// the "paper" evidence kind the brief calls out explicitly as a founder
// signal alongside GitHub, launches, and accelerator cohorts.
//
// arXiv only speaks Atom/XML, no JSON option — parsed here with targeted
// regexes rather than pulling in a full XML parser dependency for four
// fields. Normalized into Paper[], never the raw feed, same as every other
// tool in this directory.

export interface Paper {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
}

const TIMEOUT_MS = 12_000;

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function extractAlternateLink(block: string): string {
  const match = block.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/);
  return match ? match[1] : "";
}

function parseAtomEntries(xml: string): Paper[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  return entries.map((block) => ({
    title: extractTag(block, "title"),
    summary: extractTag(block, "summary"),
    url: extractAlternateLink(block) || extractTag(block, "id"),
    publishedAt: extractTag(block, "published"),
  }));
}

export async function searchArxivByAuthor(authorName: string): Promise<Paper[] | null> {
  if (process.env.VCBRAIN_MOCK === "1") {
    const { mockPapers } = await import("@/data/fixtures/founders");
    return mockPapers(authorName);
  }
  try {
    const query = `au:"${authorName}"`;
    const res = await fetch(
      `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&max_results=5&sortBy=submittedDate&sortOrder=descending`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    if (!res.ok) throw new Error(`${res.status} searching arXiv for ${authorName}`);
    const xml = await res.text();
    const papers = parseAtomEntries(xml);
    return papers.length > 0 ? papers : null;
  } catch (err) {
    console.error("[papers:arxiv]", err);
    return null;
  }
}
