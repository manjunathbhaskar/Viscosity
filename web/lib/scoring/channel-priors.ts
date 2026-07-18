// Sourcing channel as a scored entity (Novel Element 4). TIER 2 — real
// statistics, wired to the Memory layer and the Screening step, but seeded
// with only one real channel prior and no fabricated historical outcome
// dataset. To complete: (1) feed real funded-deal outcomes back into
// `recordChannelOutcome` as they happen, (2) add channel discovery so new
// channels (a specific hackathon, subreddit, arXiv category) get created
// automatically during Sourcing instead of only via manual seeding.
//
// A sourcing channel gets a Beta-distributed prior hit rate (Beta(1,1) =
// uniform, updated with observed funded/seen counts — standard Bayesian
// conjugate update, not a fabricated formula). A founder sourced through a
// channel starts from that channel's prior and is then updated by their own
// evidence via the normal 3-axis/cold-start scoring path — this function only
// produces the channel-level prior, not the final founder score.

import type { SourcingChannel } from "@/lib/types";

// Beta-Binomial conjugate prior: prior mean = dealsFunded+1 / dealsSeen+2 (Laplace smoothing).
export function channelPriorHitRate(channel: SourcingChannel): number {
  return (channel.dealsFunded + 1) / (channel.dealsSeen + 2);
}

// Bayesian update — call this when a deal sourced through `channel` reaches a
// funding decision. Real observations only; never called with synthetic data.
export function recordChannelOutcome(channel: SourcingChannel, funded: boolean): SourcingChannel {
  return {
    ...channel,
    dealsSeen: channel.dealsSeen + 1,
    dealsFunded: channel.dealsFunded + (funded ? 1 : 0),
    priorHitRate: channelPriorHitRate({
      ...channel,
      dealsSeen: channel.dealsSeen + 1,
      dealsFunded: channel.dealsFunded + (funded ? 1 : 0),
    }),
  };
}

// Blends a channel's prior into a founder's cold-start score as a Bayesian
// nudge, not a replacement — the founder's own evidence still dominates once
// any real signal exists (see lib/scoring/three-axis.ts). At zero founder
// evidence, the channel prior IS the score.
export function applyChannelPrior(founderScore: number, founderSignalCount: number, channel: SourcingChannel): number {
  const channelPrior = channelPriorHitRate(channel) * 100;
  const founderWeight = Math.min(1, founderSignalCount / 5);
  return Math.round(channelPrior * (1 - founderWeight) + founderScore * founderWeight);
}

export function seedChannels(): SourcingChannel[] {
  return [
    {
      id: "chan_hacknation_global",
      name: "Hack-Nation 6th Global AI Hackathon",
      kind: "hackathon",
      dealsSeen: 0,
      dealsFunded: 0,
      priorHitRate: 0.5, // Beta(1,1) uniform prior — no observations yet
    },
  ];
}
