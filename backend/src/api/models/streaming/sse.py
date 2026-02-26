import json


def sse(event: str, data: dict) -> str:
    """Format a Server-Sent Event frame with a JSON payload."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def sse_text(event: str, content: str) -> str:
    """Shorthand for an SSE frame carrying a simple text content field."""
    return sse(event, {"content": content})
