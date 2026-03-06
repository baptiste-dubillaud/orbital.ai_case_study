# Case Technique — Développeur Full Stack

## Contexte

Un **agent d'analyse de données** transformé d'un CLI en application web complète.

L'agent peut :

- Répondre à des questions sur des données en générant du **SQL** (via DuckDB)
- Créer des **visualisations** avec Plotly
- Expliquer son **raisonnement** (thinking) en temps réel
- Enchaîner les étapes automatiquement via des **tool calls**

L'agent est construit avec [PydanticAI](https://ai.pydantic.dev/).

---

## Architecture

### Backend (FastAPI + PydanticAI)

```
backend/src/
├── main.py                        # FastAPI app & middleware
├── config/
│   ├── config.py                  # Env-based settings (Pydantic)
├── agent/
│   ├── agent.py                   # PydanticAI agent setup
│   ├── context.py                 # AgentContext (deps for tools)
│   ├── prompt.py                  # System prompt builder
│   └── tools/
│       ├── query_data.py          # SQL queries via DuckDB
│       └── visualize.py           # Plotly chart generation
├── api/
│   ├── models/
│   │   ├── schemas.py             # Request/response Pydantic models
│   │   └── streaming/sse.py       # SSE frame helpers
│   └── v1/
│       ├── llm/                   # /chat (SSE stream) + /summarize
│       ├── data/                  # /data (dataset metadata)
│       └── output/                # /output (serve generated files)
├── services/
│   ├── streaming.py               # SSE generator (agent > events)
│   └── history.py                 # Frontend messages > ModelMessage
└── data/loader.py                 # CSV loader (singleton)
```

**Flow:** HTTP request > `streaming.py` runs the agent > events yield SSE frames > frontend consumes the stream.

### Frontend (Next.js App Router)

```
frontend/src/
├── app/                           # Next.js App Router (layout + page)
├── components/
│   ├── chat/
│   │   ├── ChatLayout.tsx         # Message list orchestrator
│   │   ├── ChatBubble.tsx         # User/assistant bubble (streaming-aware)
│   │   ├── ChatInput.tsx          # Input area with auto-resize
│   │   └── DatasetCards.tsx       # Landing page dataset cards
│   ├── reasoning/
│   │   └── ReasoningStack.tsx     # Thinking + tool calls (collapsible)
│   ├── plot/
│   │   └── PlotViewer.tsx         # Plotly iframe viewer
│   ├── markdown/
│   │   └── MarkdownRenderer.tsx   # Markdown rendering
│   └── sidebar/
│       └── Sidebar.tsx            # Conversation list
├── context/
│   ├── ChatContext.tsx            # Composes conversation + streaming
│   ├── ConversationContext.tsx    # CRUD + persistence
│   ├── DatasetContext.tsx         # Dataset list from API
│   └── ThemeContext.tsx           # Light/dark theme
├── hooks/
│   ├── useStreamChat.ts           # SSE streaming + state management
│   ├── useStaleDetection.ts       # Dead-man's switch for stalled streams
│   ├── useAutoResize.ts           # Textarea auto-height
│   └── useScrollToBottom.ts       # Auto-scroll on new messages
└── lib/
    ├── api.ts                     # API layer (apiFetch, SSE parser)
    ├── types.ts                   # Shared types & SSE event constants
    ├── reasoning.ts               # Reasoning array helpers
    └── storage.ts                 # localStorage persistence
```

**Flow:** `useStreamChat` calls `api.ts` > SSE frames are parsed and dispatched via callbacks > React state updates drive the component tree.

---

## Stack technique

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI, PydanticAI, DuckDB, Pandas, Plotly |
| **Frontend** | Next.js (App Router), TypeScript, CSS Modules, Framer Motion |
| **Streaming** | Server-Sent Events (SSE) |
| **Infra** | Docker Compose |

---

## Setup

```bash
# 1. Configurer l'environnement
cp .env.example .env
# Vérifier: LLM_BASE_URL, LLM_MODEL, LLM_API_KEY

# 2. Lancer Ollama en local (host)
ollama serve
ollama pull qwen2.5:7b

# 3. Ajouter des fichiers CSV dans backend/data/

# 4. Lancer l'application
docker compose up --build
```

Le frontend est accessible sur `http://localhost:3000`, le backend sur `http://localhost:8000`.

> Le volume `data/` est monté dans le container — ajout/modification de CSV sans rebuild.
> Les visualisations générées sont dans `output/`.
> Sur macOS Docker Desktop, `host.docker.internal` permet au container d'appeler Ollama.

---

## SSE Event Flow

Le backend streame les événements suivants au frontend :

| Event | Description |
|-------|-------------|
| `thinking` | Token de raisonnement du modèle (affiché en temps réel) |
| `tool_call` | Appel d'outil avec nom, arguments, ID |
| `tool_result` | Résultat de l'exécution de l'outil |
| `content` | Token de réponse finale du modèle |
| `Done` | Fin du stream |
| `error` | Erreur pendant le streaming |

---

## Features

### Checklist

- [x] **Backend API** avec endpoint de streaming (SSE)
- [x] **Frontend web** avec :
  - [x] Champ texte pour poser des questions
  - [x] Affichage **streaming** du thinking (collapsible/dépliable, animation 0.25s)
  - [x] Affichage des **tool calls** (nom de l'outil, arguments, résultat)
  - [x] Rendu des **visualisations Plotly** (graphiques interactifs)
  - [x] Rendu des **tableaux** de données
- [ ] **Code propre** et structuré (Context, Components, Styles séparés)

### Bonus

- [x] **Dataset cards** — les datasets disponibles sont affichés sur la page d'accueil, cliquer lance une conversation
- [x] **Stale thinking detection** — indicateur "Calling tool…" quand le modèle prépare un appel d'outil (frontend-side)
- [x] **Live reasoning stack** — le raisonnement se collapse automatiquement quand la réponse finale commence
- [x] **Framer Motion** — animations sur les messages, le reasoning expand/collapse, et les transitions
- [x] **Conversation history** — historique de conversations
- [x] **Light/Dark theme**

---

## Critères d'évaluation

| Critère | Description |
|---------|-------------|
| **Fonctionnalité** | Le streaming fonctionne, le thinking s'affiche en temps réel, les tool calls sont visibles, les visualisations s'affichent |
| **Code** | Propre, structuré, lisible, bien découpé |
| **UX** | L'expérience utilisateur est fluide et intuitive |
| **Architecture** | Bonne séparation frontend / backend, gestion des états cohérente |

---

## Ressources utiles

- [PydanticAI — Documentation](https://ai.pydantic.dev/)
- [PydanticAI — Streaming](https://ai.pydantic.dev/streaming/)
- [PydanticAI — Tools](https://ai.pydantic.dev/tools/)
- [Plotly.js — React integration](https://plotly.com/javascript/react/)
- [FastAPI — Streaming Response](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
