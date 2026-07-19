// VCBRAIN_MOCK=1 fixture set — deterministic, offline data for the judged
// demo. Deliberately includes one well-evidenced founder AND one true
// cold-start founder (zero fixture hit) so the demo can show both scoring
// paths side by side, per the brief's own emphasis on cold-start handling.

import type { GithubSignal } from "@/agent/tools/github";
import type { WebsiteExtract } from "@/agent/tools/website";
import type { LaunchHit } from "@/agent/tools/launches";
import type { XSignal } from "@/agent/tools/x";
import type { Paper } from "@/agent/tools/papers";
import type { PatentHit } from "@/agent/tools/patents";

export interface DemoFounderSpec {
  founderName: string;
  companyName: string;
  companyOneLiner: string;
  route: "applied" | "sourced";
  githubUsername?: string;
  websiteUrl?: string;
  xHandle?: string;
}

export const DEMO_FOUNDERS: DemoFounderSpec[] = [
  {
    founderName: "Ada Cortex",
    companyName: "Northwind Vectors",
    companyOneLiner: "Developer tools for a growing, underserved ai infra market",
    route: "sourced",
    githubUsername: "ada-cortex-demo",
    websiteUrl: "https://northwindvectors.demo",
    xHandle: "ada_cortex_demo",
  },
  {
    founderName: "Kenji Osei",
    companyName: "Ledger Loop",
    companyOneLiner: "B2B saas for reconciliation",
    route: "applied",
    // Deliberately no githubUsername/websiteUrl — true cold-start founder,
    // sourced from a hackathon channel with no other public footprint.
  },
  {
    founderName: "Priyanka Sridhar",
    companyName: "Helix Bio",
    companyOneLiner: "AI-assisted protein folding pipeline for biotech R&D teams",
    route: "sourced",
    // Deliberately no githubUsername — demonstrates agentic discovery:
    // Sourcing searches GitHub for "Helix Bio" itself and finds a real
    // candidate before falling back to a cold start. Also has arXiv papers
    // and a patent, since this founder is academic/technical, not a repeat
    // of Ada Cortex's shipping-cadence profile.
  },
  {
    founderName: "Marco Delacroix",
    companyName: "Vantage Robotics",
    companyOneLiner: "Autonomous warehouse robotics for mid-market logistics",
    route: "sourced",
    githubUsername: "vantage-robotics-demo",
    websiteUrl: "https://vantagerobotics.demo",
    // Website fixture text mentions an unresolved co-founder dispute — the
    // one demo founder that actually trips the Dealbreaker Scanner, so the
    // demo shows what a red deal looks like, not just clean ones.
  },
];

const GITHUB_FIXTURES: Record<string, GithubSignal> = {
  "ada-cortex-demo": {
    login: "ada-cortex-demo",
    publicRepos: 14,
    followers: 62,
    createdAt: "2021-03-04T00:00:00Z",
    recentCommitCount: 11,
    topRepos: [
      { name: "vector-shard", description: "Sharded ANN index for embedding search", pushedAt: "2026-07-10T00:00:00Z", stars: 84 },
      { name: "northwind-cli", description: "CLI for the Northwind Vectors dev platform", pushedAt: "2026-07-05T00:00:00Z", stars: 21 },
      { name: "embed-bench", description: "Benchmark harness for embedding providers", pushedAt: "2026-06-20T00:00:00Z", stars: 9 },
    ],
  },
  "helix-bio-labs": {
    login: "helix-bio-labs",
    publicRepos: 6,
    followers: 28,
    createdAt: "2022-11-19T00:00:00Z",
    recentCommitCount: 4,
    topRepos: [
      { name: "fold-pipeline", description: "Protein folding inference pipeline, biotech R&D focused", pushedAt: "2026-06-30T00:00:00Z", stars: 12 },
    ],
  },
  "vantage-robotics-demo": {
    login: "vantage-robotics-demo",
    publicRepos: 9,
    followers: 45,
    createdAt: "2021-08-02T00:00:00Z",
    recentCommitCount: 7,
    topRepos: [
      { name: "warehouse-nav", description: "Autonomous navigation stack for warehouse robots", pushedAt: "2026-07-08T00:00:00Z", stars: 33 },
    ],
  },
};

// Company-name -> discovered GitHub login, mirroring what GitHub's own
// search/users relevance ranking would surface for a real query.
const GITHUB_DISCOVERY_FIXTURES: Record<string, string> = {
  "Helix Bio": "helix-bio-labs",
};

const WEBSITE_FIXTURES: Record<string, WebsiteExtract> = {
  "https://northwindvectors.demo": {
    url: "https://northwindvectors.demo",
    title: "Northwind Vectors — developer tools for vector search",
    text:
      "Northwind Vectors builds developer tools for a growing, underserved ai infra market. " +
      "We shipped v1.0 of our sharded ANN index, wrote a technical writeup on our benchmark " +
      "methodology, and have design partners running it in production. Waitlist open.",
  },
  "https://vantagerobotics.demo": {
    url: "https://vantagerobotics.demo",
    title: "Vantage Robotics — autonomous warehouse robotics",
    text:
      "Vantage Robotics builds autonomous navigation for mid-market warehouse operators. " +
      "Note to investors: the company is currently in mediation over an unresolved co-founder " +
      "equity dispute following the departure of a technical co-founder earlier this year. " +
      "Product shipped and in pilot with two logistics customers.",
  },
};

const PAPER_FIXTURES: Record<string, Paper[]> = {
  "Priyanka Sridhar": [
    {
      title: "Fast Approximate Folding Inference for Low-Resource Biotech Pipelines",
      summary: "We present a distillation approach for protein folding inference that runs on commodity GPUs.",
      url: "https://arxiv.org/abs/demo.helixbio1",
      publishedAt: "2026-02-14T00:00:00Z",
    },
  ],
};

const PATENT_FIXTURES: Record<string, PatentHit[]> = {
  "Priyanka Sridhar": [{ patentId: "11987654", title: "Method for compressed protein structure inference", date: "2025-09-02" }],
};

const LAUNCH_FIXTURES: Record<string, LaunchHit[]> = {
  "Northwind Vectors": [
    { source: "hn", title: "Show HN: Vector Shard — sharded ANN index for embedding search", url: "https://news.ycombinator.com/item?id=demo1", points: 142, createdAt: "2026-07-11T00:00:00Z" },
  ],
};

const X_FIXTURES: Record<string, XSignal> = {
  ada_cortex_demo: {
    handle: "ada_cortex_demo",
    followers: 340,
    recentPosts: [
      {
        text: "Shipped v1.0 of vector-shard today — sharded ANN index that stays fast past 50M vectors. Benchmark writeup in the thread.",
        createdAt: "2026-07-10T14:02:00Z",
        likes: 58,
        replies: 9,
        isReplyToOther: false,
      },
      {
        text: "You're right — the p99 numbers in my first post were measured on warm cache only. Responded to feedback and re-ran cold-cache, updated the thread with real numbers.",
        createdAt: "2026-07-11T09:40:00Z",
        likes: 31,
        replies: 4,
        isReplyToOther: true,
      },
    ],
  },
};

export function mockXSignal(handle: string): XSignal | null {
  return X_FIXTURES[handle.replace(/^@/, "")] ?? null;
}

export function mockGithubSignal(username: string): GithubSignal | null {
  return GITHUB_FIXTURES[username] ?? null;
}

export function mockWebsiteExtract(url: string): WebsiteExtract | null {
  return WEBSITE_FIXTURES[url] ?? null;
}

export function mockLaunchHits(query: string): LaunchHit[] | null {
  return LAUNCH_FIXTURES[query] ?? null;
}

export function mockGithubDiscovery(query: string): string | null {
  return GITHUB_DISCOVERY_FIXTURES[query] ?? null;
}

export function mockPapers(authorName: string): Paper[] | null {
  return PAPER_FIXTURES[authorName] ?? null;
}

export function mockPatents(inventorName: string): PatentHit[] | null {
  return PATENT_FIXTURES[inventorName] ?? null;
}
