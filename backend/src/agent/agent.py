import os
import logging

from pydantic_ai import Agent, RunContext

from config.config import settings
from agent.context import AgentContext
from agent.prompt import get_system_prompt
from agent.tools.query_data import query_data
from agent.tools.visualize import visualize

log = logging.getLogger(__name__)


def _setup_env(model: str) -> None:
    """Point the openai SDK at our configured base URL if using an OpenAI-compatible provider."""
    provider = model.split(":", 1)[0].lower()
    if provider == "openai":
        os.environ["OPENAI_BASE_URL"] = settings.llm_base_url
        os.environ["OPENAI_API_KEY"] = settings.llm_api_key or "ollama"


def _build_agent(model: str) -> Agent[AgentContext]:
    log.info("Creating agent – model: %s", model)

    agent: Agent[AgentContext] = Agent(
        model=model,
        deps_type=AgentContext,
        retries=3,
    )

    @agent.system_prompt
    async def system_prompt(ctx: RunContext[AgentContext]) -> str:
        return get_system_prompt(ctx.deps.dataset_info)

    agent.tool(query_data)
    agent.tool(visualize)
    return agent


_setup_env(settings.llm_model)
_agent = _build_agent(settings.llm_model)


def get_agent() -> Agent[AgentContext]:
    return _agent
