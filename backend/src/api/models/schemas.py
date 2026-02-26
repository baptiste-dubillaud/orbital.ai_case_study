from pydantic import BaseModel, Field


# ── Shared ──────────────────────────────────────────────────────────


class MessagePayload(BaseModel):
    role: str = Field(description="Either 'user' or 'assistant'.")
    content: str = Field(description="The text content of the message.")


# ── Chat ────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    messages: list[MessagePayload] = Field(
        description="Full conversation history, oldest first. The last message is the new user prompt.",
    )


# ── Summarize ───────────────────────────────────────────────────────


class SummarizeRequest(BaseModel):
    message: str = Field(description="The user message to generate a title from.")


class SummarizeResponse(BaseModel):
    title: str = Field(description="A short (≤5 words) conversation title.")


# ── Datasets ────────────────────────────────────────────────────────


class DatasetInfo(BaseModel):
    name: str = Field(description="Sanitised file-stem used as the SQL table name.")
    rows: int = Field(description="Number of rows in the dataset.")
    columns: int = Field(description="Number of columns in the dataset.")
    column_names: list[str] = Field(description="Ordered list of column headers.")


class DatasetsResponse(BaseModel):
    datasets: list[DatasetInfo] = Field(description="Metadata for every loaded CSV.")


# ── Version ─────────────────────────────────────────────────────────


class VersionResponse(BaseModel):
    version: str = Field(description="Semantic version of the API.")
