"""Flask wrapper exposing the Viscosity Swarm pipeline as one HTTP route.

Implements the exact contract `web/lib/swarm-bridge.ts` already expects
(`POST /api/simulate` -> `{status, scenarios[], feed[], activeAgents[]}`),
so pointing `SWARM_BASE_URL` at wherever this runs requires zero changes on
the web/ side. Runs the full pipeline inline and blocks until it's done —
the caller is expected to budget for the run's typical wall-clock time (see
README.md for turbo/standard/deep mode timing).
"""
import json
import os
import sqlite3

from flask import Flask, jsonify, request
from flask_cors import CORS

from . import pipeline

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "viscosity_swarm.db")

app = Flask(__name__)
CORS(app)


def _db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    conn = _db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS raw_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic_id INTEGER,
            platform TEXT,
            content TEXT,
            url TEXT,
            crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()


_init_db()


def _parse(v):
    if isinstance(v, str):
        try:
            return json.loads(v)
        except Exception:
            return {}
    return v or {}


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "viscosity-swarm"})


@app.route("/api/simulate", methods=["POST"])
def api_simulate():
    """swarm_size: 25 (turbo, ~2min, default) | 50 (standard, ~5min) | 150+ (deep, full persona bank, ~20min)."""
    data = request.json or {}
    topic = (data.get("topic") or "").strip()
    founder = (data.get("founder") or "").strip()
    company = (data.get("company") or "").strip()
    query = " — ".join(p for p in [company, founder, topic] if p) or topic or "general market sentiment"

    swarm_size = data.get("citizens", data.get("swarm_size", 25))
    os.environ["VISCOSITY_SWARM_SIZE"] = str(swarm_size)

    conn = _db()
    cur = conn.execute("INSERT INTO topics (query) VALUES (?)", (query,))
    conn.commit()
    topic_id = cur.lastrowid
    conn.close()

    pipeline.run_pipeline_sync(topic_id, query)  # blocking — caller wants one final response
    result = pipeline.get_result(topic_id)

    if not result or "error" in result:
        return jsonify({
            "status": "failed",
            "scenarios": [],
            "feed": [],
            "activeAgents": [],
            "error": (result or {}).get("error", "pipeline produced no result"),
        })

    synthesis = _parse(result.get("synthesis"))
    risk = _parse(result.get("risk_finding"))
    prediction = synthesis.get("prediction", {}) or {}
    bull_pct = result.get("bull_pct", 50)

    scenarios = [
        {
            "title": prediction.get("best_case") or synthesis.get("linchpin") or "Bull case",
            "likelihood": round(bull_pct / 100, 2),
            "upside": synthesis.get("bull_case", ""),
            "downside": synthesis.get("kill_shot_assessment", ""),
            "turningPoints": [synthesis.get("linchpin")] if synthesis.get("linchpin") else [],
            "actions": [p.get("point") for p in synthesis.get("pressure_points", []) if p.get("actionability") == "high"],
            "confidence": synthesis.get("confidence", 0.5),
        },
        {
            "title": prediction.get("worst_case") or risk.get("trigger") or "Tail-risk case",
            "likelihood": round(float(risk.get("probability", 0.1)), 2),
            "upside": risk.get("antifragile_play", ""),
            "downside": synthesis.get("kill_shot_assessment", ""),
            "turningPoints": risk.get("cascade", []),
            "actions": [p.get("point") for p in synthesis.get("pressure_points", []) if p.get("actionability") != "high"],
            "confidence": round(1 - float(synthesis.get("confidence", 0.5)), 2),
        },
    ]

    feed = []
    for opinion in result.get("reviewer_opinions", []):
        r = _parse(opinion.get("response"))
        try:
            s = float(r.get("sentiment", 0) or 0)
        except Exception:
            s = 0.0
        feed.append({
            "agent": (opinion.get("persona") or "reviewer")[:80],
            "role": "reviewer",
            "sentiment": "bullish" if s > 0.2 else "bearish" if s < -0.2 else "neutral",
            "confidence": round(abs(s), 2),
            "text": r.get("hot_take") or r.get("gut_feeling") or "",
        })

    expert_names = [a.get("name") for a in result.get("active_agents", []) if a.get("name")]
    active_agents = expert_names + [f"{result.get('reviewer_count', 0)}-reviewer swarm ({swarm_size}-mode)"]

    return jsonify({
        "status": "succeeded",
        "scenarios": scenarios,
        "feed": feed,
        "activeAgents": active_agents,
        "meta": {
            "topic_id": topic_id,
            "posts_crawled": result.get("posts_crawled"),
            "reviewer_count": result.get("reviewer_count"),
            "dissonance_score": (result.get("dissonance") or {}).get("score"),
        },
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5100))
    app.run(host="0.0.0.0", port=port, debug=False)
