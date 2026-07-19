import { NextResponse } from "next/server";
import { generateJSON } from "@/agent/crew/claude";
import { discoverCandidates } from "@/lib/discover";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PARSE_SCHEMA = {
  type: "object",
  properties: {
    industry: { type: "string", description: "Industry or technical domain mentioned" },
    geography: { type: "string", description: "City, state, country, or region mentioned" },
    university: { type: "string", description: "University or institution mentioned" },
    credentials: { type: "string", description: "Credentials like PhD, FAANG, YC, solo founder, etc." },
    keywords: { type: "array", items: { type: "string" }, description: "Other keywords to search for" },
  },
  required: ["industry"],
};

export async function POST(req: Request) {
  const { query } = await req.json();
  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

  const parsed = await generateJSON<{
    industry?: string;
    geography?: string;
    university?: string;
    credentials?: string;
    keywords?: string[];
  }>(
    "Extract structured search filters from this natural language query about finding founders, researchers, or technical talent. Be specific.",
    query,
    PARSE_SCHEMA,
  );

  const filters = parsed ?? parseQueryFallback(query);

  if (!filters.industry && !filters.geography && !filters.university) {
    const words = query.toLowerCase().split(/\s+/);
    const techTerms = words.filter((w: string) => w.length > 4).slice(0, 2);
    filters.industry = techTerms.join(" ") || "technology";
  }

  const candidates = await discoverCandidates({
    industry: filters.industry,
    geography: filters.geography,
    university: filters.university,
  });

  return NextResponse.json({
    ok: true,
    parsedFilters: filters,
    candidates,
    interpretation: `Searching for: ${filters.industry ?? ""}${filters.geography ? ` in ${filters.geography}` : ""}${filters.university ? ` from ${filters.university}` : ""}${filters.credentials ? ` with ${filters.credentials}` : ""}`,
  });
}

function parseQueryFallback(query: string): {
  industry?: string;
  geography?: string;
  university?: string;
  credentials?: string;
} {
  const lower = query.toLowerCase();
  const industries = ["robotics", "biotech", "fintech", "ai", "energy", "cleantech", "battery", "autonomous", "crypto", "healthcare", "saas", "devtools", "climate"];
  const geos = ["san francisco", "new york", "boston", "berlin", "london", "amsterdam", "zurich", "singapore", "tel aviv", "netherlands"];
  const unis = ["mit", "stanford", "carnegie mellon", "eth zurich", "harvard", "berkeley", "caltech", "oxford", "cambridge"];

  return {
    industry: industries.find((i) => lower.includes(i)),
    geography: geos.find((g) => lower.includes(g)),
    university: unis.find((u) => lower.includes(u)),
    credentials: lower.includes("phd") ? "PhD" : lower.includes("faang") ? "FAANG" : lower.includes("yc") ? "YC" : undefined,
  };
}
