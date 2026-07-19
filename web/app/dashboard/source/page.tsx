"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface StatusResponse {
  mode: "live" | "mock";
  swarm: "live" | "mock";
  tavily: "live" | "mock";
  elevenlabs: "live" | "off";
}

const STATUS_BADGE: Record<string, string> = { live: "badge-green", mock: "badge-amber", off: "badge-gray" };

export default function SourcePage() {
  return (
    <Suspense fallback={<p className="label">loading…</p>}>
      <SourceForm />
    </Suspense>
  );
}

function SourceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [route, setRoute] = useState<"applied" | "sourced">("sourced");
  const [founderName, setFounderName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyOneLiner, setCompanyOneLiner] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [deckMarkdown, setDeckMarkdown] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/system-status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  // Prefill from a Discover candidate — never auto-submits. A human still
  // has to review and hit "run sourcing + screening" themselves.
  useEffect(() => {
    const name = params.get("prefillName");
    if (!name) return;
    setFounderName(name);
    setCompanyName(params.get("prefillCompany") ?? "");
    setGithubUsername(params.get("prefillGithub") ?? "");
    setRoute("sourced");
    setPrefilledFrom(params.get("prefillSource"));
  }, [params]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/source", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          route,
          founderName,
          companyName,
          companyOneLiner: companyOneLiner || undefined,
          githubUsername: githubUsername || undefined,
          websiteUrl: websiteUrl || undefined,
          xHandle: xHandle || undefined,
          deckMarkdown: deckMarkdown || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "sourcing failed");
      router.push(`/deal/${data.deal.id}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rise grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="card p-6">
        <p className="label mb-1">flowstart</p>
        <h1 className="serif text-[30px] leading-tight text-[var(--ink)]">Pulse → Simulation → Diligence</h1>
        <p className="mt-3 max-w-xl text-[13.5px] text-[var(--muted)]">
          Spin up a deal by sourcing a founder yourself (GitHub, launches, web, Tavily pulse) or by taking their
          application deck. Each run fans into swarm simulation, an influence plan, the diligence bridge, and memo audio.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { title: "Pulse", body: "Tavily web signals become claims (web_pulse)", key: "tavily" as const },
            { title: "Swarm", body: "Adversarial multi-agent simulation via sidecar", key: "swarm" as const },
            { title: "Audio", body: "Memos to speech with ElevenLabs", key: "elevenlabs" as const },
          ].map((item) => (
            <div key={item.title} className="card-paper p-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium">{item.title}</span>
                {status && <span className={`badge ${STATUS_BADGE[status[item.key]]}`}>{status[item.key]}</span>}
              </div>
              <p className="mt-2 text-[12.5px] text-[var(--muted)]">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 card-paper p-4">
          <p className="label mb-2">run sequence</p>
          <ol className="flex flex-col gap-1.5 text-[13px] text-[var(--muted)]">
            <li>1) Collect founder + company → sourcing run</li>
            <li>2) Claims → 3-axis score, trust, validator, dealbreakers</li>
            <li>3) Swarm simulation &amp; Tavily pulse stored as evidence</li>
            <li>4) Memo + optional audio for IC</li>
          </ol>
        </div>
      </div>

      <div className="card-paper p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="label mb-1">source</p>
            <h2 className="text-[18px] font-semibold">Create a new deal</h2>
          </div>
          <div className="card-dark rounded-full px-3 py-1.5 text-[12px]">
            {route === "sourced" ? "Sourced" : "Applied"}
          </div>
        </div>

        {prefilledFrom && (
          <div className="mb-4 rounded-lg bg-[var(--accent-soft,rgba(28,78,216,0.08))] px-3 py-2 text-[12.5px]">
            Prefilled from a Discover candidate ({prefilledFrom}). This is an inferred match, not a confirmed
            identity — review before running.
          </div>
        )}

        <div className="card-paper mb-4 flex gap-1.5 p-1.5">
          <button
            className={`pill-tab flex-1 justify-center ${route === "sourced" ? "active" : ""}`}
            onClick={() => setRoute("sourced")}
          >
            sourced
          </button>
          <button
            className={`pill-tab flex-1 justify-center ${route === "applied" ? "active" : ""}`}
            onClick={() => setRoute("applied")}
          >
            applied
          </button>
        </div>

        <div className="space-y-3">
          <input className="input" placeholder="founder name *" value={founderName} onChange={(e) => setFounderName(e.target.value)} />
          <input className="input" placeholder="company name *" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <input className="input" placeholder="one-liner (optional)" value={companyOneLiner} onChange={(e) => setCompanyOneLiner(e.target.value)} />

          {route === "sourced" && (
            <>
              <input className="input" placeholder="github username (optional)" value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} />
              <input className="input" placeholder="website url (optional)" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
              <input className="input" placeholder="x handle (optional)" value={xHandle} onChange={(e) => setXHandle(e.target.value)} />
            </>
          )}

          {route === "applied" && (
            <textarea
              className="input min-h-32"
              placeholder="paste deck text / application text here"
              value={deckMarkdown}
              onChange={(e) => setDeckMarkdown(e.target.value)}
            />
          )}

          {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}

          {busy && (
            <div className="flex items-center gap-2">
              <span className="sentiment-dot live bullish" />
              <p className="label">running GitHub, launches, web, Tavily pulse in parallel…</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button className="btn" disabled={busy || !founderName || !companyName} onClick={submit}>
              {busy ? "sourcing + screening…" : "run sourcing + screening"}
            </button>
            <p className="text-[12px] text-[var(--muted)]">Runs sourcing → scoring → traceability in one shot.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
