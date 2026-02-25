import os

import logging

from pydantic_ai import Agent, RunContext

from config.config import settings

from agent.context import AgentContext
from agent.prompt import get_system_prompt
from agent.tools.query_data import query_data
from agent.tools.visualize import visualize


class PydanticAIAgent:

    def __init__(self, model: str):
        self.__configure_model_provider_env(model)
        self.agent = self.__create_agent(model)

    def __configure_model_provider_env(self, model: str) -> None:
        provider = model.split(":", 1)[0].lower()

        if provider == "openai":
            os.environ["OPENAI_BASE_URL"] = settings.llm_base_url
            os.environ["OPENAI_API_KEY"] = settings.llm_api_key or "ollama"

    def __create_agent(self, model: str) -> Agent[AgentContext]:
        """Create the data analysis agent with query and visualization tools."""
        logging.info(f"Creating agent with model: {model}")
        agent: Agent[AgentContext] = Agent(
            model=model,
            deps_type=AgentContext,
            retries=3,
        )

        @agent.system_prompt
        async def dynamic_system_prompt(ctx: RunContext[AgentContext]) -> str:
            return get_system_prompt(ctx.deps.dataset_info)

        agent.tool(query_data)
        agent.tool(visualize)

        return agent

agent = PydanticAIAgent(model=settings.llm_model)

def get_agent() -> Agent:
    return agent.agent 
