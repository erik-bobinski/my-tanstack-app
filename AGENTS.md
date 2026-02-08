# AGENTS.md

## Critical Rules

- **ONLY use `bun`** — never npm/yarn/pnpm
- **NEVER run dev/build commands** (`bun dev`, `bun build`, `bun run dev`, etc.)

## Commands

| Scope | Check | Notes |
| ---- | ---- | ---- |
| All packages | `bun run check` | Runs `turbo run check` across all workspaces |
| `apps/web` | `bun run check --filter=web` | Uses `tsgo --noEmit` |
| `apps/cli` | `bun run check --filter=cli` | Uses `tsgo --noEmit` |

## Code Style

- **Runtime**: Bun only. No Node.js, npm, pnpm, vite, dotenv.
- **TypeScript**: Strict mode enabled. ESNext target. Type-checked with `tsgo` (TypeScript 7 native preview).
- **Imports**: External packages first, then local. Use `.ts` extensions for local imports.
- **Bun APIs**: Prefer `Bun.file`, `Bun.serve`, `bun:sqlite`, `Bun.$` over Node equivalents.
- **Testing**: Use `bun:test` with `import { test, expect } from "bun:test"`.

## Project Structure

```
apps/web/          → TanStack Start (React) web app
apps/cli/          → Terminal UI chat client (OpenTUI)
packages/shared/   → Shared types and model definitions
convex/            → Convex backend (schema, queries, mutations, actions)
```

Monorepo managed with Bun workspaces and Turborepo.

## Architecture

### Convex Backend (`convex/`)

Two tables:

- **`conversations`** — `title`, `model`, `createdAt`. Indexed by `by_createdAt`.
- **`messages`** — `conversationId` (ref → conversations), `role` (`"user"` | `"assistant"`), `content`, `model` (optional), `isStreaming` (boolean), `createdAt`. Indexed by `by_conversationId`.

Public API:

| Function | Type | Purpose |
| ---- | ---- | ---- |
| `conversations.list` | query | All conversations, newest first |
| `conversations.get` | query | Single conversation by ID |
| `conversations.create` | mutation | Create conversation with title + model |
| `conversations.updateModel` | mutation | Change model for a conversation |
| `conversations.remove` | mutation | Delete conversation + cascade delete messages |
| `messages.list` | query | All messages for a conversation, ascending |
| `chat.send` | action | Send a message and stream LLM response |

Internal mutations (`messages.createUserMessage`, `messages.createAssistantMessage`, `messages.updateStreaming`, `messages.finishStreaming`) are called only by the `chat.send` action.

### LLM Token Streaming (`convex/chat.ts`)

Provider: **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`), configured via `OPENROUTER_API_KEY` env var.

Flow:
1. `chat.send` action saves the user message and creates an assistant message placeholder (`isStreaming: true`, empty content).
2. Fetches conversation history (excluding any still-streaming messages) and sends it to OpenRouter with `stream: true`.
3. Reads the SSE response stream, parsing `data:` lines for `choices[0].delta.content`.
4. Accumulates content in memory and flushes to the database via `updateStreaming` throttled to ~100ms intervals.
5. On completion, calls `finishStreaming` which sets `isStreaming: false` with the final content.

Both the web app and CLI receive updates reactively — Convex subscriptions push message changes to all connected clients in real time.

### Shared Package (`packages/shared/`)

Exports `MODELS`, `DEFAULT_MODEL`, `getModelName()`, and the `Model` type. Models include Gemini 2.5 Flash (default), GPT-4o Mini, Llama 3.1 70B, GPT-4o, and Claude Sonnet 4. Used by both web and CLI for consistent model selection.

### Web App (`apps/web/`)

Stack: React 19, TanStack Router + Start + React Query, Tailwind CSS v4, Vite 7.

Routes:
- `/` — Landing page
- `/chat/` — Conversation list + empty state
- `/chat/$conversationId` — Chat interface with sidebar, messages, and input

Convex integration via `@convex-dev/react-query`:
- Queries (`useQuery(convexQuery(...))`) auto-subscribe to real-time database changes.
- Mutations (`useConvexMutation(...)`) for creating/deleting conversations.
- Actions (`useConvexAction(api.chat.send)`) to trigger LLM streaming.

Streaming messages update incrementally in the UI as Convex pushes changes. The `isStreaming` flag drives a pulsing indicator and disables input until the response is complete.

### CLI App (`apps/cli/`)

Stack: Bun runtime, OpenTUI (`@opentui/core`) for terminal rendering, Convex client.

Three modes toggled via keyboard shortcuts:
- **chat** — Message input and display (default)
- **conversations** (`Alt+C`) — List/create/switch conversations
- **models** (`Alt+M`) — Select LLM model

Uses `ConvexClient` directly (not React Query). Subscribes to `conversations.list` and `messages.list` via `client.onUpdate()` for real-time updates. Sends messages via `client.action(api.chat.send, ...)`. The streaming UX mirrors the web app — messages update progressively as the backend flushes content to the database.
