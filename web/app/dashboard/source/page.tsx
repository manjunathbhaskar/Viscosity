"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SourcePage() {
  const router = useRouter();
  const [route, setRoute] = useState<"inbound" | "outbound">("outbound");
  const [founderName, setFounderName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyOneLiner, setCompanyOneLiner] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [deckMarkdown, setDeckMarkdown] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="rise flex max-w-xl flex-col gap-5">
      <div>
        <p className="label mb-1">sourcing</p>
        <h1 className="serif text-[28px]">Source a founder</h1>
        <p className="mt-2 text-[13.5px] text-[var(--muted)]">
          Inbound apply needs just a name + deck. Outbound scan pulls GitHub, launches, and website —
          no deck required. Both converge into the same Screening step.
        </p>
      </div>

      <div className="card-paper flex gap-2 p-1.5">
        <button
          className={`flex-1 rounded-md py-2 text-[13px] ${route === "outbound" ? "btn" : "btn-ghost"}`}
          onClick={() => setRoute("outbound")}
        >
          outbound scan
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-[13px] ${route === "inbound" ? "btn" : "btn-ghost"}`}
          onClick={() => setRoute("inbound")}
        >
          inbound apply
        </button>
      </div>

      <input className="input" placeholder="founder name *" value={founderName} onChange={(e) => setFounderName(e.target.value)} />
      <input className="input" placeholder="company name *" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
      <input className="input" placeholder="one-liner (optional)" value={companyOneLiner} onChange={(e) => setCompanyOneLiner(e.target.value)} />

      {route === "outbound" && (
        <>
          <input className="input" placeholder="github username (optional)" value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} />
          <input className="input" placeholder="website url (optional)" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        </>
      )}

      {route === "inbound" && (
        <textarea
          className="input min-h-32"
          placeholder="paste deck text / application text here"
          value={deckMarkdown}
          onChange={(e) => setDeckMarkdown(e.target.value)}
        />
      )}

      {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}

      <button className="btn w-fit" disabled={busy || !founderName || !companyName} onClick={submit}>
        {busy ? "sourcing + screening…" : "run sourcing + screening"}
      </button>
    </div>
  );
}
