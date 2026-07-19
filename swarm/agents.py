"""Analyst-agent roster: which fixed "lens" agents join a run, and their
display metadata. Selection is keyword-based (fast, deterministic, no LLM
call needed just to decide who shows up).
"""

# Always active — the core lens every run gets, regardless of topic.
CORE_AGENTS = [
    "provocateur",
    "sentiment_reader",
    "catalyst_spotter",
    "synthesis_orchestrator",
    "tail_risk_hunter",
    "chaos_mathematician",
    "reality_checker",
]

KEYWORD_AGENTS = {
    "finance": (
        ["stock", "market", "crash", "bitcoin", "crypto", "price", "invest", "fund",
         "ipo", "earnings", "nvidia", "tesla", "trading", "etf", "bond", "inflation"],
        ["economist", "market_analyst", "trader", "quant_analyst", "scenario_simulator",
         "cycle_historian", "value_investor", "flow_tracker", "sentiment_extreme_watcher",
         "institutional_lens", "crypto_defi"],
    ),
    "startup": (
        ["startup", "founder", "raise", "funding", "vc", "yc", "pitch", "valuation",
         "series a", "unicorn", "bootstrap", "saas", "mrr", "arr"],
        ["vc_partner", "pitch_specialist", "cfo_lens", "fundraising_strategist", "devils_advocate"],
    ),
    "tech": (
        ["ai", "software", "developer", "code", "platform", "app", "cloud",
         "gpu", "model", "llm", "agent", "automation", "robot"],
        ["tech_analyst", "regulatory_analyst"],
    ),
    "geopolitics": (
        ["war", "china", "russia", "sanctions", "election", "policy", "regulation",
         "government", "ban", "tariff", "nato"],
        ["geopolitical_strategist", "regulatory_analyst"],
    ),
    "social": (
        ["tiktok", "viral", "social media", "influencer", "brand", "cancel",
         "gen z", "culture", "trend", "meme"],
        ["social_impact_analyst", "culture_decoder"],
    ),
    "career": (
        ["career", "job", "quit", "salary", "hire", "mba", "resume", "remote work"],
        ["career_strategist", "devils_advocate"],
    ),
    "health": (
        ["health", "vaccine", "pharma", "fda", "drug", "pandemic", "medical"],
        ["regulatory_analyst"],
    ),
}

DISPLAY_INFO = {
    "provocateur": {"name": "Agent Provocateur", "emoji": "⚡", "role": "Disruption finder"},
    "sentiment_reader": {"name": "Sentiment Reader", "emoji": "◈", "role": "Crowd reader"},
    "catalyst_spotter": {"name": "Catalyst Spotter", "emoji": "◉", "role": "Flip-event predictor"},
    "synthesis_orchestrator": {"name": "Synthesis Orchestrator", "emoji": "\U0001f9e0", "role": "Decision-map brain"},
    "tail_risk_hunter": {"name": "Tail-Risk Hunter", "emoji": "☠", "role": "Kill-shot finder"},
    "chaos_mathematician": {"name": "Chaos Mathematician", "emoji": "\U0001f98b", "role": "Tipping points & cascades"},
    "reality_checker": {"name": "Reality Checker", "emoji": "\U0001f4aa", "role": "Ground-truth sanity check"},
    "economist": {"name": "Chief Economist", "emoji": "\U0001f4ca", "role": "Macro forces"},
    "market_analyst": {"name": "Market Analyst", "emoji": "\U0001f4c8", "role": "Asset pricing & flows"},
    "trader": {"name": "Floor Trader", "emoji": "\U0001f4c9", "role": "Short-term tactics"},
    "quant_analyst": {"name": "Quant Analyst", "emoji": "\U0001f4d0", "role": "Numbers & probabilities"},
    "scenario_simulator": {"name": "Scenario Simulator", "emoji": "\U0001f3b2", "role": "Wide-scenario stress test"},
    "cycle_historian": {"name": "Boom & Bust Historian", "emoji": "\U0001f4c9", "role": "Historical cycle stage"},
    "value_investor": {"name": "Value Investor", "emoji": "\U0001f989", "role": "Margin-of-safety lens"},
    "flow_tracker": {"name": "Flow Tracker", "emoji": "\U0001f40b", "role": "Smart-money flows"},
    "sentiment_extreme_watcher": {"name": "Sentiment Extreme Watcher", "emoji": "\U0001f631", "role": "Retail emotion signal"},
    "institutional_lens": {"name": "Institutional Lens", "emoji": "\U0001f3db️", "role": "Large-fund perspective"},
    "crypto_defi": {"name": "Crypto Strategist", "emoji": "₿", "role": "On-chain & DeFi"},
    "vc_partner": {"name": "VC Partner", "emoji": "\U0001f680", "role": "Startup evaluation"},
    "pitch_specialist": {"name": "Pitch Specialist", "emoji": "\U0001f4cb", "role": "Investable narrative"},
    "cfo_lens": {"name": "CFO Lens", "emoji": "\U0001f4ca", "role": "Unit economics & runway"},
    "fundraising_strategist": {"name": "Fundraising Strategist", "emoji": "\U0001f4b0", "role": "Cap table & terms"},
    "tech_analyst": {"name": "Tech Analyst", "emoji": "\U0001f4bb", "role": "Adoption curves"},
    "regulatory_analyst": {"name": "Regulatory Analyst", "emoji": "⚖️", "role": "Legal & compliance risk"},
    "geopolitical_strategist": {"name": "Geopolitical Strategist", "emoji": "\U0001f30d", "role": "State-actor analysis"},
    "social_impact_analyst": {"name": "Social Impact Analyst", "emoji": "\U0001f465", "role": "Cultural dynamics"},
    "culture_decoder": {"name": "Culture Decoder", "emoji": "\U0001f4f1", "role": "Vibe check & virality"},
    "devils_advocate": {"name": "Devil's Advocate", "emoji": "\U0001f9d8", "role": "Cognitive-bias check"},
    "career_strategist": {"name": "Career Strategist", "emoji": "\U0001f3af", "role": "Career optimization"},
}


def select_agents(query: str) -> list[str]:
    """Keyword-bucket auto-selection. Always includes CORE_AGENTS, adds
    topic-relevant specialists on top, deduped and order-preserving."""
    q = query.lower()
    active = list(CORE_AGENTS)
    for _domain, (keywords, agent_ids) in KEYWORD_AGENTS.items():
        if any(k in q for k in keywords):
            active += agent_ids
    return list(dict.fromkeys(active))


def agent_display_info(agent_ids: list[str]) -> list[dict]:
    return [{**DISPLAY_INFO[aid], "id": aid} for aid in agent_ids if aid in DISPLAY_INFO]
