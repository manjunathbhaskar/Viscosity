// Live self-validation harness (Novel Element 2). TIER 2 — the harness is
// real and wired to the Memory layer; the historical ground truth is not
// fabricated. To complete during an actual event: call `logPrediction` for
// every team scored at the hackathon BEFORE placements are announced, then
// call `scoreAgainstAnnouncedResults` once placements are public and diff.
// This turns "can public footprint predict founder success" from a slide
// claim into a real, falsifiable experiment inside the 24h window.

import { promises as fs } from "fs";
import path from "path";
import type { DealRecord, ThreeAxisScore } from "@/lib/types";

const DIR = path.join(process.cwd(), "data", "runtime");
const FILE = path.join(DIR, "self-validation-log.json");

export interface PredictionLogEntry {
  dealId: string;
  founderName: string;
  companyName: string;
  predictedAt: string;
  axisScore: ThreeAxisScore;
  compositeRankHint: number; // for ranking only — never shown as a single "score" in the UI
}

export interface AnnouncedResult {
  companyName: string;
  placement: number; // 1 = winner, etc.
}

export interface ValidationReport {
  predictions: PredictionLogEntry[];
  announced: AnnouncedResult[];
  spearmanCorrelation: number | null; // null if fewer than 2 overlapping entries
  matchedCount: number;
  generatedAt: string;
}

async function readLog(): Promise<PredictionLogEntry[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as PredictionLogEntry[];
  } catch {
    return [];
  }
}

async function writeLog(entries: PredictionLogEntry[]): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(entries, null, 2));
}

// compositeRankHint deliberately blends the 3 axes ONLY for ranking purposes in
// this harness — the product itself never shows this blended number anywhere else.
function rankHint(axisScore: ThreeAxisScore): number {
  return (axisScore.founder.score + axisScore.market.score + axisScore.ideaVsMarket.score) / 3;
}

export async function logPrediction(deal: DealRecord, founderName: string, companyName: string, axisScore: ThreeAxisScore): Promise<void> {
  const entries = await readLog();
  entries.push({
    dealId: deal.id,
    founderName,
    companyName,
    predictedAt: new Date().toISOString(),
    axisScore,
    compositeRankHint: rankHint(axisScore),
  });
  await writeLog(entries);
}

function spearman(a: number[], b: number[]): number | null {
  if (a.length < 2 || a.length !== b.length) return null;
  const rank = (arr: number[]) => {
    const sorted = [...arr].map((v, i) => [v, i] as const).sort((x, y) => y[0] - x[0]);
    const ranks = new Array(arr.length).fill(0);
    sorted.forEach(([, i], rankIdx) => (ranks[i] = rankIdx + 1));
    return ranks;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  const dSquaredSum = ra.reduce((acc, r, i) => acc + (r - rb[i]) ** 2, 0);
  return 1 - (6 * dSquaredSum) / (n * (n * n - 1));
}

// Real ground truth only — pass the actual announced placements. Never
// fabricate this array; if it's empty, the report says so explicitly.
export async function scoreAgainstAnnouncedResults(announced: AnnouncedResult[]): Promise<ValidationReport> {
  const predictions = await readLog();
  const matched: { predicted: number; actual: number }[] = [];
  for (const pred of predictions) {
    const a = announced.find((x) => x.companyName.toLowerCase() === pred.companyName.toLowerCase());
    if (a) matched.push({ predicted: pred.compositeRankHint, actual: -a.placement }); // lower placement number = better, so negate
  }

  return {
    predictions,
    announced,
    spearmanCorrelation: spearman(matched.map((m) => m.predicted), matched.map((m) => m.actual)),
    matchedCount: matched.length,
    generatedAt: new Date().toISOString(),
  };
}
