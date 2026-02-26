from pydantic_ai.messages import ModelRequest, ModelResponse, UserPromptPart, TextPart

from api.models import MessagePayload


def build_history(messages: list[MessagePayload]):
    """Convert frontend messages into pydantic-ai ModelMessage objects."""
    history = []
    for msg in messages:
        if msg.role == "user":
            history.append(ModelRequest(parts=[UserPromptPart(content=msg.content)]))
        elif msg.role == "assistant":
            history.append(ModelResponse(parts=[TextPart(content=msg.content)]))
    return history
