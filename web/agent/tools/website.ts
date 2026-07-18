// Website distillation tool — always-real, no API key needed. Plain fetch,
// strip HTML down to text, truncate to a sane length for downstream
// LLM/keyword processing. Fixture fallback on fetch failure (dead link,
// timeout) rather than throwing.

const TIMEOUT_MS = 10_000;
const MAX_CHARS = 6000;

export interface WebsiteExtract {
  url: string;
  title: string | null;
  text: string;
}

function stripHtml(html: string): { title: string | null; text: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { title, text: text.slice(0, MAX_CHARS) };
}

export async function fetchWebsiteExtract(url: string): Promise<WebsiteExtract | null> {
  if (process.env.VCBRAIN_MOCK === "1") {
    const { mockWebsiteExtract } = await import("@/data/fixtures/founders");
    return mockWebsiteExtract(url);
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "vc-brain-scout/0.1" } });
    if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
    const html = await res.text();
    const { title, text } = stripHtml(html);
    return { url, title, text };
  } catch (err) {
    console.error("[website]", err);
    return null;
  }
}
