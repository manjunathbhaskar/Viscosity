// VCBRAIN_MOCK=1 fixture set — deterministic, offline data for the judged
// demo. Deliberately includes one well-evidenced founder AND one true
// cold-start founder (zero fixture hit) so the demo can show both scoring
// paths side by side, per the brief's own emphasis on cold-start handling.

import type { GithubSignal } from "@/agent/tools/github";
import type { WebsiteExtract } from "@/agent/tools/website";
import type { LaunchHit } from "@/agent/tools/launches";
import type { XSignal } from "@/agent/tools/x";

export interface DemoFounderSpec {
  founderName: string;
  companyName: string;
  companyOneLiner: string;
  githubUsername?: string;
  websiteUrl?: string;
  xHandle?: string;
}

export const DEMO_FOUNDERS: DemoFounderSpec[] = [
  {
    founderName: "Ada Cortex",
    companyName: "Northwind Vectors",
    companyOneLiner: "Developer tools for a growing, underserved ai infra market",
    githubUsername: "ada-cortex-demo",
    websiteUrl: "https://northwindvectors.demo",
    xHandle: "ada_cortex_demo",
  },
  {
    founderName: "Kenji Osei",
    companyName: "Ledger Loop",
    companyOneLiner: "B2B saas for reconciliation",
    // Deliberately no githubUsername/websiteUrl — true cold-start founder,
    // sourced from a hackathon channel with no other public footprint.
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
