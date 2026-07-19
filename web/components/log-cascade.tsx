// Ambient background — a faint, ultra-low-opacity mono log waterfall that
// signals "there's a massive machine running behind this page" without
// competing with the actual UI. Pure CSS marquee (duplicated list + a
// looping transform), no client JS needed, so it's server-render safe with
// no hydration mismatch risk.

const LOG_LINES = [
  "[SWARM] Agent #084 parsing GitHub commits... 412 entries found.",
  "[SWARM] Agent #192 executing bull-thesis vector match...",
  "[DILIGENCE] Calculating confidence span for founder... [42, 89]",
  "[PULSE] Tavily query resolved — 4 findings, relevance 0.71-0.86",
  "[SWARM] Citizen #017 (skeptic) sentiment: -0.62",
  "[SWARM] Citizen #204 (optimist) sentiment: +0.81",
  "[TRUST] dataVolume 0.33 x cleanliness 0.80 x agreement 0.50",
  "[SWARM] Assassin agent found kill-shot candidate, p=0.08",
  "[AUDIO] Triggering ElevenLabs synthesis bridge...",
  "[DILIGENCE] Red flag scan: benford 0.12, coc 0.08, gaps 0.03",
  "[SWARM] NEXUS orchestrator synthesizing scenario 2/2...",
  "[MEMORY] Founder score strengthened — interval narrowed 18%",
  "[SWARM] Agent #301 cross-checking claim against source...",
  "[SCORING] Founder axis 84 (72-96), confidence 0.75",
  "[TRACE] conclusion bridged to diligence signal FOUNDER_MOMENTUM",
];

function Column({ reverse = false, delay = 0 }: { reverse?: boolean; delay?: number }) {
  const lines = [...LOG_LINES, ...LOG_LINES];
  return (
    <div
      className="log-cascade-col"
      style={{ animationDirection: reverse ? "reverse" : "normal", animationDelay: `${delay}s` }}
    >
      {lines.map((line, i) => (
        <p key={i} className="mono whitespace-nowrap">
          {line}
        </p>
      ))}
    </div>
  );
}

export default function LogCascade() {
  return (
    <div className="log-cascade" aria-hidden="true">
      <Column delay={0} />
      <Column reverse delay={-8} />
    </div>
  );
}
