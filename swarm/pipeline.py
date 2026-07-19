"""The Viscosity Swarm pipeline: crawl -> compress -> risk scan -> reviewer
swarm -> dissonance calculation -> synthesis -> (optional) adaptive scoring.

Runs synchronously against a local Ollama instance. Six real stages plus one
non-fatal learning stage; nothing here is faked or stubbed — every JSON
result is a real LLM call or a real arithmetic calculation over that call's
output, matching the shape `service.py`'s `/api/simulate` route expects.
"""
import json
import os
import random
import re
import sqlite3
import time

import httpx

from . import agents as agent_registry
from . import scoring
from .personas import BULLISH, BEARISH, MIXED

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "viscosity_swarm.db")
OLLAMA_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

# Models — pick any Ollama tag that fits your hardware; these are the
# defaults tuned for the three swarm-size modes documented in README.md.
SWARM_MODEL = os.environ.get("VISCOSITY_SWARM_MODEL", "llama3.2:3b")
RISK_MODEL = os.environ.get("VISCOSITY_RISK_MODEL", "phi4:14b")
SYNTHESIS_MODEL = os.environ.get("VISCOSITY_SYNTHESIS_MODEL", "mistral-small:24b")


def _db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _update_status(topic_id, status):
    conn = _db()
    conn.execute("UPDATE topics SET status=? WHERE id=?", (status, topic_id))
    conn.commit()
    conn.close()


def _ollama_chat(prompt, system="", model=SYNTHESIS_MODEL, json_mode=False):
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    body = {"model": model, "messages": messages, "stream": False}
    if json_mode:
        body["format"] = "json"
    resp = httpx.post(f"{OLLAMA_URL}/api/chat", json=body, timeout=600)
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def _ollama_flush(model):
    """Free GPU RAM between stages by asking Ollama to unload the model."""
    try:
        httpx.post(f"{OLLAMA_URL}/api/generate", json={"model": model, "prompt": "", "keep_alive": 0}, timeout=10)
    except Exception:
        pass


def run_pipeline_sync(topic_id: int, query: str):
    """The full pipeline. Runs inline (blocking) — the caller (service.py's
    /api/simulate route) waits for this to return before responding."""
    try:
        # === STAGE 1: CRAWL public sources ===
        _update_status(topic_id, "crawling")
        posts = _crawl(query)
        _save_live_event(topic_id, "crawl", {"posts": len(posts), "platforms": list(set(p["platform"] for p in posts))})

        active_agent_ids = agent_registry.select_agents(query)
        active_agents_info = agent_registry.agent_display_info(active_agent_ids)
        _save_live_event(topic_id, "agents_selected", {"count": len(active_agents_info), "agents": active_agents_info})

        if len(posts) < 5:
            _update_status(topic_id, "failed")
            _save_result(topic_id, {"error": "Not enough public data found", "posts": len(posts)})
            return

        conn = _db()
        conn.execute("INSERT INTO raw_posts (topic_id, platform, content, url) VALUES (?,?,?,?)",
                      (topic_id, "summary", f"Crawled {len(posts)} posts", ""))
        conn.commit()
        conn.close()

        # === STAGE 2: COMPRESS into opinion clusters ===
        _update_status(topic_id, "analyzing")
        posts_text = "\n".join(f"[{p['platform']}] {p['content'][:200]}" for p in posts[:20])
        clusters = _ollama_chat(
            prompt=f"Topic: {query}\n\nPosts:\n{posts_text}\n\nCompress these into 5 opinion clusters. "
                   f"For each: name, core_belief, sentiment (-1 to 1), emotion, post_count estimate.",
            system="You compress social data into 5 opinion clusters. Output JSON array of 5 objects with: "
                   "label, core_belief, sentiment, emotion, post_count.",
            model=SWARM_MODEL,
            json_mode=True,
        )
        _ollama_flush(SWARM_MODEL)

        # === STAGE 3: RISK SCAN — find the tail-risk trigger nobody's pricing in ===
        _update_status(topic_id, "risk_scan")
        risk_finding = _ollama_chat(
            prompt=f"Topic: {query}\n\nOpinion clusters:\n{clusters[:1000]}\n\n"
                   f"Find the tail-risk trigger. What low-probability, high-impact event would collapse the current narrative?",
            system='You are the Tail-Risk Hunter. Find the low-probability, high-impact event nobody is talking about.\n'
                   'Output JSON: {"trigger": "...", "cascade": ["step1", "step2", "step3"], '
                   '"probability": 0.0-0.2, "impact_score": 0.8-1.0, "antifragile_play": "how to profit from the collapse"}',
            model=RISK_MODEL,
            json_mode=True,
        )
        _ollama_flush(RISK_MODEL)
        _save_live_event(topic_id, "risk_scan", {"risk_finding": risk_finding[:500]})

        # === STAGE 4: REVIEWER SWARM — many small, opinionated persona calls ===
        _update_status(topic_id, "simulating")
        swarm_size = int(os.environ.get("VISCOSITY_SWARM_SIZE", "25"))

        if swarm_size >= 200:
            personas = BULLISH[:60] + BEARISH[:50] + MIXED[:80]
        elif swarm_size >= 100:
            personas = BULLISH[:30] + BEARISH[:25] + MIXED[:45]
        elif swarm_size >= 50:
            personas = BULLISH[:15] + BEARISH[:15] + MIXED[:20]
        else:
            # Turbo mode (default): ~25 reviewers, ~2 minutes on a single GPU.
            personas = BULLISH[:8] + BEARISH[:8] + MIXED[:9]
        random.shuffle(personas)

        reviewer_opinions = []
        wave_size = 10
        wave_count = max(1, -(-len(personas) // wave_size))  # ceiling division — don't drop a partial final wave
        for wave_num in range(wave_count):
            wave = personas[wave_num * wave_size: wave_num * wave_size + wave_size]
            _update_status(topic_id, f"simulating wave {wave_num + 1}/{wave_count}")

            for persona in wave:
                if persona in BULLISH:
                    bias = "You are OPTIMISTIC. Find reasons why this succeeds. Your gut says YES."
                elif persona in BEARISH:
                    bias = "You are SKEPTICAL. Find reasons why this fails. Your gut says NO."
                else:
                    bias = "You are ANALYTICAL. Weigh both sides. Your gut is uncertain."

                raw = _ollama_chat(
                    prompt=f"Topic: {query}\nContext: {clusters[:400]}\nHidden risk: {risk_finding[:200]}\n\n"
                           f"React based on your persona. Be specific and opinionated.",
                    system=f'You are {persona}. {bias} Do NOT be balanced — pick a side based on your character. '
                           f'Output JSON: {{"gut_feeling": "one raw sentence", "sentiment": -1.0 to 1.0, '
                           f'"emotion": "fear|greed|anger|hope|apathy|panic|euphoria|caution|excitement|skepticism", '
                           f'"hot_take": "your most extreme opinion in one sentence"}}',
                    model=SWARM_MODEL,
                    json_mode=True,
                )
                reviewer_opinions.append({"persona": persona, "response": raw})
                _save_live_event(topic_id, "reviewer", {
                    "persona": persona, "response": raw, "wave": wave_num + 1, "index": len(reviewer_opinions),
                })

            _ollama_flush(SWARM_MODEL)

        # === STAGE 5: DISSONANCE — pure arithmetic over the reviewer swarm, no LLM ===
        _update_status(topic_id, "calculating")
        dissonance = _calculate_dissonance(reviewer_opinions, risk_finding)

        # === STAGE 6: SYNTHESIS — one call turning everything into a decision map ===
        _update_status(topic_id, "synthesis")
        synthesis = _ollama_chat(
            prompt=f"""TOPIC: {query}

OPINION CLUSTERS: {clusters[:1500]}

TAIL-RISK FINDING:
- Trigger: {dissonance["risk_trigger"]}
- Probability: {dissonance["risk_probability"] * 100:.0f}%
- Impact: {dissonance["risk_impact"] * 100:.0f}%

REVIEWER SWARM CENSUS ({dissonance["crowd"]["total"]} reviewers):
- Bulls: {dissonance["crowd"]["bulls"]} ({dissonance["crowd"]["bull_pct"]}%) | Bears: {dissonance["crowd"]["bears"]} ({dissonance["crowd"]["bear_pct"]}%) | Neutral: {dissonance["crowd"]["neutrals"]}
- Average sentiment: {dissonance["avg_sentiment"]:.2f}
- Top emotions: {dissonance["top_emotions"]}

DISSONANCE (calculated from data, not an opinion):
- Overall score: {dissonance["score"]}/100
- The Trap: {dissonance["the_trap"]["description"]}
- The Blindspot: {dissonance["the_blindspot"]["description"]}
- The Chaos: {dissonance["the_chaos"]["description"]}

Synthesize into a decision-ready map. The dissonance data above is REAL — do not override it. Focus on the LINCHPIN and the ANTIFRAGILE PLAY.""",
            system="""You are the Synthesis Orchestrator. The dissonance scores are PRE-CALCULATED from real data — do NOT change them. Your job is to interpret them and find the linchpin.
Output JSON: {
  "linchpin": "the one thing everything depends on",
  "bull_case": "why it could succeed (2-3 sentences)",
  "kill_shot_assessment": "is the tail-risk finding credible? why or why not?",
  "antifragile_output": "one paragraph: what to DO about this (specific, actionable)",
  "prediction": {"most_likely": "...", "best_case": "...", "worst_case": "..."},
  "pressure_points": [{"point": "...", "actionability": "high|medium|low"}],
  "confidence": 0.0-1.0
}""",
            model=RISK_MODEL,
            json_mode=True,
        )
        _ollama_flush(RISK_MODEL)

        # === STAGE 7: ADAPTIVE SCORING (non-fatal, best-effort) ===
        _update_status(topic_id, "learning")
        _save_live_event(topic_id, "system", {"message": "Adaptive scoring — recording reviewer weights for this domain..."})
        try:
            parsed_opinions = []
            for o in reviewer_opinions:
                try:
                    parsed_opinions.append({"persona": o["persona"], "parsed": json.loads(o["response"])})
                except Exception:
                    parsed_opinions.append({"persona": o["persona"], "parsed": {}})
            scoring.record_run(
                topic=query,
                topic_domain=scoring.detect_domain(query),
                reviewer_opinions=parsed_opinions,
                risk_trigger=dissonance["risk_trigger"],
                dissonance_score=dissonance["score"],
                avg_sentiment=dissonance["avg_sentiment"],
            )
        except Exception as e:
            print(f"[viscosity-swarm] adaptive scoring skipped (non-fatal): {e}")

        # === SAVE RESULT ===
        _update_status(topic_id, "complete")
        _save_live_event(topic_id, "system", {"message": "Analysis complete."})
        _save_result(topic_id, {
            "clusters": clusters,
            "risk_finding": risk_finding,
            "reviewer_opinions": reviewer_opinions,
            "synthesis": synthesis,
            "dissonance": dissonance,
            "posts_crawled": len(posts),
            "reviewer_count": dissonance["crowd"]["total"],
            "bull_pct": dissonance["crowd"]["bull_pct"],
            "bear_pct": dissonance["crowd"]["bear_pct"],
            "active_agents": active_agents_info,
            "active_agent_count": len(active_agents_info),
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        _update_status(topic_id, "failed")
        _save_result(topic_id, {"error": str(e), "traceback": traceback.format_exc()})


def _crawl(query: str) -> list[dict]:
    """Pull public signal from web search, Reddit, Hacker News, and YouTube
    titles. Every source is best-effort — one failing doesn't fail the run."""
    posts = []

    try:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS
        ddgs = DDGS()
        for r in ddgs.text(query, max_results=30):
            posts.append({"platform": "web", "content": f"{r.get('title', '')}. {r.get('body', '')}", "url": r.get("href", "")})
        for r in ddgs.news(query, max_results=20):
            posts.append({"platform": "news", "content": f"{r.get('title', '')}. {r.get('body', '')}", "url": r.get("url", "")})
    except Exception as e:
        print(f"[viscosity-swarm] web search error: {e}")

    try:
        resp = httpx.get(
            f"https://www.reddit.com/search.json?q={query}&sort=relevance&limit=30",
            headers={"User-Agent": "ViscosityBrain/1.0"},
            timeout=15,
        )
        if resp.status_code == 200:
            for post in resp.json().get("data", {}).get("children", []):
                d = post.get("data", {})
                posts.append({
                    "platform": "reddit",
                    "content": f"{d.get('title', '')}. {d.get('selftext', '')[:300]}",
                    "url": f"https://reddit.com{d.get('permalink', '')}",
                })
    except Exception as e:
        print(f"[viscosity-swarm] Reddit error: {e}")

    try:
        resp = httpx.get(f"https://hn.algolia.com/api/v1/search?query={query}&tags=story&hitsPerPage=20", timeout=15)
        if resp.status_code == 200:
            for hit in resp.json().get("hits", []):
                posts.append({
                    "platform": "hackernews",
                    "content": f"{hit.get('title', '')}. {(hit.get('story_text') or '')[:200]}",
                    "url": hit.get("url", f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"),
                })
    except Exception as e:
        print(f"[viscosity-swarm] HN error: {e}")

    try:
        resp = httpx.get(
            f"https://www.youtube.com/results?search_query={query}",
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "en-US"},
        )
        if resp.status_code == 200:
            titles = re.findall(r'"title":\{"runs":\[\{"text":"([^"]{10,100})"', resp.text)
            for title in titles[:10]:
                posts.append({"platform": "youtube", "content": f"[VIDEO] {title}", "url": ""})
    except Exception as e:
        print(f"[viscosity-swarm] YouTube error: {e}")

    return posts


def _calculate_dissonance(reviewer_opinions: list[dict], risk_finding_raw: str) -> dict:
    """Pure arithmetic over the reviewer swarm's parsed sentiments — no LLM
    call in this stage. Three deltas (extremity, blindspot, variance),
    weighted 0.3 / 0.4 / 0.3 into one composite score."""
    sentiments = []
    emotions: dict[str, int] = {}
    for c in reviewer_opinions:
        try:
            r = json.loads(c["response"]) if isinstance(c["response"], str) else c["response"]
            s = float(r.get("sentiment", 0))
            sentiments.append(s)
            emo = r.get("emotion", "neutral")
            emotions[emo] = emotions.get(emo, 0) + 1
        except Exception:
            pass

    total = max(len(sentiments), 1)
    bulls = sum(1 for s in sentiments if s > 0.2)
    bears = sum(1 for s in sentiments if s < -0.2)
    neutrals = total - bulls - bears
    avg_sentiment = sum(sentiments) / total if sentiments else 0.0
    bull_pct = round(bulls / total * 100, 1)
    bear_pct = round(bears / total * 100, 1)

    try:
        risk_data = json.loads(risk_finding_raw) if isinstance(risk_finding_raw, str) else risk_finding_raw
        risk_prob = float(risk_data.get("probability", 0.1))
        risk_impact = float(risk_data.get("impact_score", 0.5))
        risk_trigger = risk_data.get("trigger", "Unknown")
    except Exception:
        risk_prob, risk_impact, risk_trigger = 0.1, 0.5, str(risk_finding_raw)[:200]

    # DELTA 1: THE TRAP — how one-sided is the crowd?
    the_trap = round(abs(avg_sentiment) * 100, 1)
    trap_desc = f"Crowd is {bull_pct}% bull / {bear_pct}% bear. " + (
        "Extreme consensus — classic trap setup." if the_trap > 60 else
        "Moderate split — healthy debate." if the_trap < 30 else
        "Leaning one way but not extreme."
    )

    # DELTA 2: THE BLINDSPOT — consensus strength vs. the risk finding's feasibility
    consensus_strength = max(bull_pct, bear_pct)
    risk_feasibility = risk_prob * risk_impact * 100
    the_blindspot = round(abs(consensus_strength - (100 - risk_feasibility)), 1)
    blindspot_desc = f"Consensus at {consensus_strength}% but tail-risk feasibility is {risk_feasibility:.0f}%. " + (
        "CRITICAL — crowd ignoring a viable threat." if the_blindspot > 50 else
        "Moderate gap — some awareness of risk." if the_blindspot > 25 else
        "Low gap — risk mostly priced in."
    )

    # DELTA 3: THE CHAOS — sentiment variance
    if sentiments:
        mean_s = sum(sentiments) / len(sentiments)
        variance = sum((s - mean_s) ** 2 for s in sentiments) / len(sentiments)
        the_chaos = round(min(variance * 100, 100), 1)
    else:
        the_chaos = 50.0
    chaos_desc = f"Sentiment variance: {the_chaos:.0f}. " + (
        "MAXIMUM CHAOS — reviewers fundamentally disagree." if the_chaos > 50 else
        "Moderate disagreement — no clear consensus." if the_chaos > 25 else
        "Low chaos — crowd is aligned."
    )

    score = round(the_trap * 0.3 + the_blindspot * 0.4 + the_chaos * 0.3, 1)
    score = min(100.0, max(0.0, score))

    return {
        "score": score,
        "the_trap": {"value": the_trap, "description": trap_desc},
        "the_blindspot": {"value": the_blindspot, "description": blindspot_desc},
        "the_chaos": {"value": the_chaos, "description": chaos_desc},
        "crowd": {"bulls": bulls, "bears": bears, "neutrals": neutrals, "total": total, "bull_pct": bull_pct, "bear_pct": bear_pct},
        "top_emotions": sorted(emotions.items(), key=lambda x: -x[1])[:5],
        "avg_sentiment": avg_sentiment,
        "risk_trigger": risk_trigger,
        "risk_probability": risk_prob,
        "risk_impact": risk_impact,
    }


def _save_live_event(topic_id, event_type, data):
    conn = _db()
    conn.execute(
        "CREATE TABLE IF NOT EXISTS live_feed (id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER, "
        "event_type TEXT, data TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    )
    conn.execute(
        "INSERT INTO live_feed (topic_id, event_type, data) VALUES (?,?,?)",
        (topic_id, event_type, json.dumps(data, ensure_ascii=False, default=str)),
    )
    conn.commit()
    conn.close()


def get_live_feed(topic_id, after_id=0):
    conn = _db()
    conn.execute(
        "CREATE TABLE IF NOT EXISTS live_feed (id INTEGER PRIMARY KEY AUTOINCREMENT, topic_id INTEGER, "
        "event_type TEXT, data TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    )
    rows = conn.execute(
        "SELECT id, event_type, data, created_at FROM live_feed WHERE topic_id=? AND id>? ORDER BY id",
        (topic_id, after_id),
    ).fetchall()
    conn.close()
    events = []
    for r in rows:
        try:
            data = json.loads(r["data"])
        except Exception:
            data = {"raw": r["data"]}
        events.append({"id": r["id"], "type": r["event_type"], "data": data, "time": r["created_at"]})
    return events


def _save_result(topic_id, result):
    conn = _db()
    conn.execute(
        "INSERT INTO raw_posts (topic_id, platform, content, url) VALUES (?,?,?,?)",
        (topic_id, "result", json.dumps(result, ensure_ascii=False, default=str), ""),
    )
    conn.commit()
    conn.close()


def get_result(topic_id):
    conn = _db()
    row = conn.execute(
        "SELECT content FROM raw_posts WHERE topic_id=? AND platform='result' ORDER BY id DESC LIMIT 1",
        (topic_id,),
    ).fetchone()
    conn.close()
    if row:
        try:
            return json.loads(row["content"])
        except json.JSONDecodeError:
            return {"raw": row["content"]}
    return None
