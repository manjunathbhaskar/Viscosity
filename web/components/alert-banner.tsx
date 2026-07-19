"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Alert {
  id: string;
  type: "new_signal" | "stage_change" | "high_score";
  founderName: string;
  companyName: string;
  dealId: string;
  message: string;
}

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => setAlerts(data.alerts ?? []))
      .catch(() => {});
  }, []);

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {visible.map((a) => (
        <div
          key={a.id}
          className="card-paper flex items-center justify-between gap-3 border-l-4 p-3"
          style={{ borderLeftColor: a.type === "high_score" ? "var(--green)" : a.type === "new_signal" ? "var(--accent)" : "var(--blue)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="status-ping flex-shrink-0" />
            <p className="text-[13px] truncate">
              <span className="font-medium">{a.message}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={`/deal/${a.dealId}`} className="btn text-[11px] px-3 py-1.5">
              view profile
            </Link>
            <button
              className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors text-[16px] leading-none"
              onClick={() => setDismissed((s) => new Set([...s, a.id]))}
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
