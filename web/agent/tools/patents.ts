// Patents tool — PatentsView API (search.patentsview.org), the official
// public patent search API maintained by the USPTO. Key-gated
// (PATENTSVIEW_API_KEY): no key -> null, same guard convention as every
// other optional tool here. Built to PatentsView's documented v1 REST
// contract (POST with a query object and a field list) — honest disclosure:
// I don't have a key to test against, so unlike github.ts/papers.ts this
// path is NOT live-verified. If you add a key, verify the response shape
// still matches PATENTSVIEW_FIELDS below before trusting it in production.

export interface PatentHit {
  patentId: string;
  title: string;
  date: string;
}

const TIMEOUT_MS = 12_000;
const PATENTSVIEW_FIELDS = ["patent_id", "patent_title", "patent_date"];

export async function searchPatentsByInventor(inventorName: string): Promise<PatentHit[] | null> {
  if (process.env.VCBRAIN_MOCK === "1") {
    const { mockPatents } = await import("@/data/fixtures/founders");
    return mockPatents(inventorName);
  }

  const apiKey = process.env.PATENTSVIEW_API_KEY;
  if (!apiKey) return null;

  try {
    const [first, ...rest] = inventorName.trim().split(/\s+/);
    const last = rest.join(" ") || first;
    const res = await fetch("https://search.patentsview.org/api/v1/patent/", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        q: { _and: [{ _text_any: { inventors_last_name: last } }, { _text_any: { inventors_first_name: first } }] },
        f: PATENTSVIEW_FIELDS,
        o: { size: 5 },
      }),
    });
    if (!res.ok) throw new Error(`${res.status} searching PatentsView for ${inventorName}`);
    const data = await res.json();
    const patents = Array.isArray(data.patents) ? data.patents : [];
    return patents.length > 0
      ? patents.map((p: Record<string, unknown>) => ({
          patentId: String(p.patent_id ?? ""),
          title: String(p.patent_title ?? ""),
          date: String(p.patent_date ?? ""),
        }))
      : null;
  } catch (err) {
    console.error("[patents]", err);
    return null;
  }
}
