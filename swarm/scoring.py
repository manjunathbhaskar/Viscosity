"""Adaptive scoring — a lightweight, non-fatal learning signal.

After each run, this records which reviewer personas' gut reactions lined up
with the tail-risk finding, and stores one summary pattern per run. It's
intentionally simple: an exponential-moving-average weight per persona per
topic domain, not a full agent-ranking system. Nothing here changes a run's
output yet — `get_reviewer_weight` is exposed for a future prompt-shaping
pass to consume, but `pipeline.py` doesn't call it. Failure here must never
fail a run, so every public function is safe to wrap in try/except.
"""
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "viscosity_swarm.db")


def _db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_tables():
    conn = _db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS reviewer_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reviewer_key TEXT NOT NULL,
            topic_domain TEXT NOT NULL,
            weight REAL DEFAULT 1.0,
            runs INTEGER DEFAULT 0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(reviewer_key, topic_domain)
        );
        CREATE TABLE IF NOT EXISTS insight_bank (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic_domain TEXT,
            summary TEXT NOT NULL,
            confidence REAL DEFAULT 0.5,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()


def get_reviewer_weight(reviewer_key: str, topic_domain: str) -> float:
    conn = _db()
    row = conn.execute(
        "SELECT weight FROM reviewer_scores WHERE reviewer_key=? AND topic_domain=?",
        (reviewer_key, topic_domain),
    ).fetchone()
    conn.close()
    return row["weight"] if row else 1.0


def record_run(topic: str, topic_domain: str, reviewer_opinions: list[dict], risk_trigger: str,
                dissonance_score: float, avg_sentiment: float) -> None:
    """Score which reviewers' gut/hot-take mentioned the risk-finder's
    trigger words, or were contrarian during a high-dissonance run, and bump
    their weight with a 70/30 exponential moving average. Also stores one
    plain-text insight summarizing the run."""
    init_tables()
    conn = _db()
    trigger_words = [w for w in risk_trigger.lower().split()[:6] if len(w) > 3]

    for opinion in reviewer_opinions:
        persona = opinion.get("persona", "unknown")
        parsed = opinion.get("parsed") or {}
        gut = str(parsed.get("gut_feeling", "")).lower()
        hot_take = str(parsed.get("hot_take", "")).lower()
        sentiment = float(parsed.get("sentiment", 0) or 0)

        edge_bonus = 0.0
        if trigger_words and any(w in gut + " " + hot_take for w in trigger_words):
            edge_bonus = 0.5
        if dissonance_score > 50 and abs(sentiment - avg_sentiment) > 0.5:
            edge_bonus += 0.3
        if edge_bonus == 0.0:
            continue

        reviewer_key = f"reviewer_{persona[:40].replace(' ', '_')}"
        existing = conn.execute(
            "SELECT weight, runs FROM reviewer_scores WHERE reviewer_key=? AND topic_domain=?",
            (reviewer_key, topic_domain),
        ).fetchone()
        new_weight = 0.5 + min(edge_bonus, 1.0) * 0.5
        if existing:
            new_weight = existing["weight"] * 0.7 + new_weight * 0.3
            conn.execute(
                "UPDATE reviewer_scores SET weight=?, runs=runs+1, last_updated=CURRENT_TIMESTAMP "
                "WHERE reviewer_key=? AND topic_domain=?",
                (new_weight, reviewer_key, topic_domain),
            )
        else:
            conn.execute(
                "INSERT INTO reviewer_scores (reviewer_key, topic_domain, weight, runs) VALUES (?,?,?,1)",
                (reviewer_key, topic_domain, new_weight),
            )

    conn.execute(
        "INSERT INTO insight_bank (topic_domain, summary, confidence) VALUES (?,?,?)",
        (topic_domain, f"Topic '{topic[:100]}' — dissonance {dissonance_score}, risk trigger: {risk_trigger[:100]}",
         dissonance_score / 100),
    )
    conn.commit()
    conn.close()


def detect_domain(query: str) -> str:
    q = query.lower()
    domains = {
        "finance": ["stock", "market", "trading", "bitcoin", "crypto", "price", "invest", "fund", "ipo", "earnings"],
        "tech": ["ai", "software", "startup", "app", "platform", "developer", "code", "saas", "cloud", "gpu"],
        "politics": ["election", "policy", "government", "regulation", "law", "vote"],
        "social": ["culture", "trend", "viral", "social media", "influencer", "brand", "tiktok"],
        "geopolitics": ["war", "sanctions", "china", "russia", "trade war", "nato", "military"],
        "health": ["vaccine", "pandemic", "health", "fda", "drug", "pharma", "medical"],
        "career": ["job", "career", "salary", "hire", "quit", "founder", "mba", "resume"],
    }
    for domain, keywords in domains.items():
        if any(k in q for k in keywords):
            return domain
    return "general"
