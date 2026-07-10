"""
DeepSeek AI client — shared client used by the dashboard chatbot (ai/chat_engine.py).

Recommendation numbers and text are rule-based only (recommendations/recommendation_engine.py) —
DeepSeek does not generate or rewrite them, so a recommendation can never show
a fabricated number or an unfilled template placeholder.
"""
import os
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
