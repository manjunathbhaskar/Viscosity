// Hackathon-grade persistence: one JSON file under data/runtime/, queued through
// globalThis so every Next.js route bundle (each gets its own module instance in
// dev) serializes through the same read-modify-write chain — the file is the
// single source of truth.

import { promises as fs } from "fs";
import { tmpdir } from "os";
import path from "path";
import { MemoryState, emptyMemory } from "./schema";

const DIR = process.env.VERCEL
  ? path.join(tmpdir(), "vcbrain-runtime")
  : path.join(process.cwd(), "data", "runtime");
const FILE = path.join(DIR, "memory.json");

const g = globalThis as unknown as { __vcbrainMemoryQueue?: Promise<unknown> };
g.__vcbrainMemoryQueue ??= Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = () => task();
  const p = (g.__vcbrainMemoryQueue as Promise<unknown>).then(run, run);
  g.__vcbrainMemoryQueue = p.catch(() => {}); // isolate failures from the chain
  return p;
}

export async function getMemory(): Promise<MemoryState> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as MemoryState;
  } catch {
    return emptyMemory();
  }
}

export function setMemory(next: MemoryState): Promise<void> {
  return enqueue(async () => {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(next, null, 2));
  });
}

export function updateMemory(
  fn: (m: MemoryState) => MemoryState | void
): Promise<MemoryState> {
  return enqueue(async () => {
    const m = await getMemory();
    const result = fn(m);
    const next = (result ?? m) as MemoryState;
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(next, null, 2));
    return next;
  });
}

export async function resetMemory(): Promise<MemoryState> {
  const m = emptyMemory();
  await setMemory(m);
  return m;
}

export async function seedMemoryIfEmpty(seed: () => MemoryState): Promise<MemoryState> {
  const current = await getMemory();
  if (current.founders.length > 0) return current;
  const seeded = seed();
  await setMemory(seeded);
  return seeded;
}
