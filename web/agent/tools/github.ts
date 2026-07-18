// GitHub public-data tool. Try the real call with a timeout, normalize into
// our domain type, never throw. Public GitHub API works unauthenticated
// (60 req/hr); GITHUB_TOKEN lifts the rate limit to 5000/hr if set, but
// absence of a token is NOT a mock-branch guard here — this tool always
// attempts a real call unless VCBRAIN_MOCK=1.

export interface GithubSignal {
  login: string;
  publicRepos: number;
  followers: number;
  createdAt: string;
  recentCommitCount: number; // commits across recent pushed events, proxy for shipping cadence
  topRepos: { name: string; description: string | null; pushedAt: string; stars: number }[];
}

const TIMEOUT_MS = 10_000;

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { authorization: `Bearer ${token}` } : {};
}

export async function fetchGithubSignal(username: string): Promise<GithubSignal | null> {
  if (process.env.VCBRAIN_MOCK === "1") {
    const { mockGithubSignal } = await import("@/data/fixtures/founders");
    return mockGithubSignal(username); // deterministic demo data, or null for a true cold-start founder
  }
  try {
    const headers = { accept: "application/vnd.github+json", ...authHeaders() };
    const [userRes, reposRes, eventsRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) }),
      fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=10`, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
      fetch(`https://api.github.com/users/${username}/events/public?per_page=30`, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    ]);
    if (!userRes.ok) throw new Error(`${userRes.status} fetching user ${username}`);

    const user = await userRes.json();
    const repos = reposRes.ok ? await reposRes.json() : [];
    const events = eventsRes.ok ? await eventsRes.json() : [];

    const recentCommitCount = Array.isArray(events)
      ? events.filter((e: { type?: string }) => e.type === "PushEvent").length
      : 0;

    const topRepos = Array.isArray(repos)
      ? repos.slice(0, 5).map((r: Record<string, unknown>) => ({
          name: String(r.name ?? ""),
          description: (r.description as string) ?? null,
          pushedAt: String(r.pushed_at ?? ""),
          stars: Number(r.stargazers_count ?? 0),
        }))
      : [];

    return {
      login: username,
      publicRepos: Number(user.public_repos ?? 0),
      followers: Number(user.followers ?? 0),
      createdAt: String(user.created_at ?? ""),
      recentCommitCount,
      topRepos,
    };
  } catch (err) {
    console.error("[github]", err);
    return null;
  }
}
