"""
DeepSeek AI client — reads processed metrics from ClickHouse and generates
rich, data-grounded recommendations that are written back to ClickHouse.

Falls back to rule-based description enrichment when ClickHouse is unavailable.
"""
import os
import json
import logging
from typing import Optional
from openai import OpenAI

logger = logging.getLogger(__name__)

_client: Optional[OpenAI] = None


def get_client() -> Optional[OpenAI]:
    global _client
    if _client is not None:
        return _client

    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    if not api_key:
        logger.info("DEEPSEEK_API_KEY not set — AI enrichment disabled")
        return None

    _client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com",
    )
    logger.info("DeepSeek client initialized")
    return _client


def is_available() -> bool:
    return get_client() is not None


def enrich_recommendations(recommendations: list[dict]) -> list[dict]:
    """
    Lightweight enrichment: takes rule-based recommendation dicts and rewrites
    descriptions to be more specific and actionable.
    Used as a fallback when ClickHouse is not connected.
    """
    client = get_client()
    if client is None or not recommendations:
        return recommendations

    to_enrich = [r for r in recommendations if r.get("priority") == "high"][:5]
    if not to_enrich:
        return recommendations

    rec_list = json.dumps([
        {
            "id":          r["id"],
            "campaign":    r.get("campaign_name", ""),
            "platform":    r.get("platform", ""),
            "type":        r.get("type", ""),
            "title":       r["title"],
            "description": r["description"],
        }
        for r in to_enrich
    ], indent=2)

    system_prompt = (
        "You are a senior performance marketing analyst. "
        "Rewrite each recommendation description to be more specific, actionable, and data-driven. "
        "Keep each description to 2-3 sentences maximum. "
        "Return a JSON array with the same 'id' fields and a new 'description' field only."
    )

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Enrich these recommendations:\n{rec_list}"},
            ],
            max_tokens=800,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content.strip()
        parsed = json.loads(raw)
        enriched_list = parsed if isinstance(parsed, list) else parsed.get("recommendations", [])
        enriched_map = {item["id"]: item["description"] for item in enriched_list if "id" in item}
        return [
            {**r, "description": enriched_map.get(r["id"], r["description"])}
            for r in recommendations
        ]
    except Exception as e:
        logger.warning("DeepSeek enrichment failed: %s", e)
        return recommendations


