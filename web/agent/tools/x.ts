// X (Twitter) founder-signal tool. Unlike a generic social-engagement
// tracker, this looks for exactly the process signal cold-start scoring
// wants: does the founder post about shipping, do they publicly engage with
// technical critique, how deep is their technical writing — not follower
// counts or who they follow.
//
// Single path: the official X API v2, Bearer-token gated (X_BEARER_TOKEN).
// No key -> null, same guard convention as every other tool in this
// directory. Output is always the normalized XSignal type below — never the
// raw API response — so callers never touch X's wire format.

export interface XPost {
  text: string;
  createdAt: string;
  likes: number;
  replies: number;
  isReplyToOther: boolean;
}

export interface XSignal {
  handle: string;
  followers: number;
  recentPosts: XPost[];
}

const TIMEOUT_MS = 10_000;

export async function fetchXSignal(handle: string): Promise<XSignal | null> {
  if (process.env.VCBRAIN_MOCK === "1") {
    const { mockXSignal } = await import("@/data/fixtures/founders");
    return mockXSignal(handle);
  }

  const token = process.env.X_BEARER_TOKEN;
  if (!token) return null;

  try {
    const clean = handle.replace(/^@/, "");
    const headers = { authorization: `Bearer ${token}` };

    const userRes = await fetch(
      `https://api.x.com/2/users/by/username/${clean}?user.fields=public_metrics`,
      { headers, signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    if (!userRes.ok) throw new Error(`${userRes.status} fetching x user ${clean}`);
    const user = await userRes.json();
    const id = user?.data?.id;
    if (!id) return null;
    const followers = Number(user?.data?.public_metrics?.followers_count ?? 0);

    const tweetsRes = await fetch(
      `https://api.x.com/2/users/${id}/tweets?max_results=30&tweet.fields=created_at,public_metrics,in_reply_to_user_id`,
      { headers, signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    if (!tweetsRes.ok) throw new Error(`${tweetsRes.status} fetching x posts for ${clean}`);
    const tweetsData = await tweetsRes.json();

    const recentPosts: XPost[] = (tweetsData?.data ?? []).map((t: Record<string, unknown>) => ({
      text: String(t.text ?? ""),
      createdAt: String(t.created_at ?? ""),
      likes: Number((t.public_metrics as Record<string, unknown>)?.like_count ?? 0),
      replies: Number((t.public_metrics as Record<string, unknown>)?.reply_count ?? 0),
      isReplyToOther: Boolean(t.in_reply_to_user_id),
    }));

    return { handle: clean, followers, recentPosts };
  } catch (err) {
    console.error("[x]", err);
    return null;
  }
}
