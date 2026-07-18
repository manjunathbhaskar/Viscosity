// Diligence bridge — typed HTTP client for a separate, external diligence
// service reached over plain HTTP. That service is never modified or
// embedded here; this file is the only place VC Brain talks to it.
//
// Every function tries the real call, times out, normalizes the response,
// and on ANY failure (network error, non-2xx, service not running, or an
// optional local model runtime not running for LLM-backed routes) falls
// back to a fixture rather than throwing — so a dead diligence service
// degrades the UI instead of crashing it. VCBRAIN_MOCK=1 skips the network
// call entirely.
//
// Route inventory (see docs/ARCHITECTURE.md for the full contract):
//   POST /api/ma/upload                        multipart file -> ingest
//   POST /api/ma/warroom                        {doc_id?} -> Red Flag Score + breakdown
//   POST /api/ma/semantic/absences              {doc_ids} -> Absence Detection
//   POST /api/ma/signals/emit                   {signal_type, source_entity, ...} -> signal log
//   POST /api/ma/adversarial/pollinate/:docId    adversarial debate (needs a local model runtime)
//   POST /api/ma/leukocyte/:docId                Dealbreaker Scanner (rule-based pre-screen,
//                                                only needs a model runtime if an LLM pass triggers)
//   POST /api/ma/kg/build/:docId                 Knowledge graph extraction
//   GET  /api/ma/kg/cascade/:nodeId               dependency cascade trace

const BASE = process.env.DILIGENCE_BASE_URL || "http://localhost:5000";
const TIMEOUT_MS = 20_000;

function mockMode(): boolean {
  return process.env.VCBRAIN_MOCK === "1";
}

async function safeFetch<T>(path: string, init: RequestInit, fallback: () => T): Promise<T> {
  if (mockMode()) return fallback();
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[diligence-bridge:${path}]`, err);
    return fallback();
  }
}

// ── Upload ────────────────────────────────────────────────────────────────

export interface DiligenceUploadResult {
  doc_id: number;
  filename: string;
  chunks: number;
  pages: number;
  chars: number;
  kg_delta: { nodes_added: number; edges_added: number };
  doc_type: string;
  defined_terms: number;
  impact: Record<string, unknown>;
  ltm: Record<string, unknown>;
}

export async function uploadDossier(founderId: string, filename: string, markdown: string): Promise<DiligenceUploadResult> {
  return safeFetch<DiligenceUploadResult>(
    "/api/ma/upload",
    (() => {
      const form = new FormData();
      form.append("file", new Blob([markdown], { type: "text/markdown" }), filename);
      return { method: "POST", body: form };
    })(),
    () => mockUploadResult(founderId, filename)
  );
}

function mockUploadResult(founderId: string, filename: string): DiligenceUploadResult {
  return {
    doc_id: Math.abs(hashCode(founderId)) % 100000,
    filename,
    chunks: 12,
    pages: 3,
    chars: 4200,
    kg_delta: { nodes_added: 6, edges_added: 4 },
    doc_type: "founder_dossier",
    defined_terms: 2,
    impact: { mock: true },
    ltm: { mock: true },
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

// ── Warroom / Red Flag Score (source for Trust Score retrofit) ────────────

export interface WarroomBreakdown {
  benford_contribution: number;
  coc_contribution: number;
  truth_gap_contribution: number;
}

export interface WarroomResult {
  score: number;
  traffic_light: "red" | "amber" | "green";
  verdict: string;
  total_red_flags: number;
  flags: { source: string; severity: string; message: string }[];
  breakdown: WarroomBreakdown;
}

export async function runWarroom(docId?: number): Promise<WarroomResult> {
  return safeFetch<WarroomResult>(
    "/api/ma/warroom",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ doc_id: docId }) },
    () => mockWarroomResult()
  );
}

function mockWarroomResult(): WarroomResult {
  return {
    score: 22,
    traffic_light: "green",
    verdict: "No material red flags found in available material.",
    total_red_flags: 1,
    flags: [{ source: "coc", severity: "low", message: "Standard founder vesting clause noted, no cliff anomaly." }],
    breakdown: { benford_contribution: 4, coc_contribution: 10, truth_gap_contribution: 8 },
  };
}

// ── Absence Detection (memo gap-flagging) ──────────────────────────────────

export interface AbsentTopic {
  topic: string;
  severity: string;
  suggested_question: string;
}

export interface AbsenceResult {
  absent_topics: AbsentTopic[];
  present_topics: string[];
  coverage_score: number;
  high_severity_gaps: number;
  flag: boolean;
}

export async function detectAbsences(docIds: number[]): Promise<AbsenceResult> {
  return safeFetch<AbsenceResult>(
    "/api/ma/semantic/absences",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ doc_ids: docIds }) },
    () => mockAbsenceResult()
  );
}

function mockAbsenceResult(): AbsenceResult {
  return {
    absent_topics: [
      { topic: "Cap Table", severity: "medium", suggested_question: "What is the current cap table and any outstanding SAFEs?" },
      { topic: "Related Party", severity: "low", suggested_question: "Any related-party transactions to disclose?" },
    ],
    present_topics: ["Material Contracts", "IP Ownership", "Litigation"],
    coverage_score: 0.72,
    high_severity_gaps: 0,
    flag: true,
  };
}

// ── Signal log (Agentic Traceability bridge) ─────────────────────────────

// Extends the diligence service's existing free-text signal type — no schema
// change needed on that side, since its signal-type column is free-text.
export type VcBrainSignalType = "FOUNDER_MOMENTUM" | "TRACTION_SIGNAL" | "CONTRADICTION_FLAG";

export interface SignalEmitResult {
  id: number;
  signal_type: string;
  source_entity: string;
  strength: number;
  created_at: string;
}

export async function emitDiligenceSignal(params: {
  signalType: VcBrainSignalType;
  sourceEntity: string;
  sourceDocId: number;
  strength: number;
  payload?: Record<string, unknown>;
}): Promise<SignalEmitResult> {
  return safeFetch<SignalEmitResult>(
    "/api/ma/signals/emit",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signal_type: params.signalType,
        source_entity: params.sourceEntity,
        source_doc_id: params.sourceDocId,
        source_chunk_id: 0,
        strength: params.strength,
        payload: params.payload ?? {},
      }),
    },
    () => ({
      id: Math.floor(Math.random() * 100000),
      signal_type: params.signalType,
      source_entity: params.sourceEntity,
      strength: params.strength,
      created_at: new Date().toISOString(),
    })
  );
}

// ── Dealbreaker Scanner (Leukocyte) ─────────────────────────────────────────

export interface LeukocyteFinding {
  rule: string;
  severity: "critical" | "high" | "medium" | "low";
  excerpt: string;
}

export interface LeukocyteResult {
  pre_screen_findings: LeukocyteFinding[];
  critical_count: number;
  skip_llm: boolean;
  rules_fired: number;
}

export async function scanDealbreakers(docId: number): Promise<LeukocyteResult> {
  return safeFetch<LeukocyteResult>(
    `/api/ma/leukocyte/${docId}`,
    { method: "POST" },
    () => ({ pre_screen_findings: [], critical_count: 0, skip_llm: false, rules_fired: 0 })
  );
}

export function diligenceBridgeStatus(): { mock: boolean; base: string } {
  return { mock: mockMode(), base: BASE };
}
