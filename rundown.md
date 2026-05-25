# afterburn — Complete Project Rundown

> End-to-end guide to initializing, understanding, and running the afterburn application.

---

## Table of Contents

1. [What is afterburn?](#what-is-afterburn)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Environment Setup](#environment-setup)
5. [Installation & Running](#installation--running)
6. [Web Application (Next.js Frontend)](#web-application-nextjs-frontend)
7. [API Routes](#api-routes)
8. [Components Deep Dive](#components-deep-dive)
9. [Agent System (gitagent)](#agent-system-gitagent)
10. [Causal Knowledge Graph](#causal-knowledge-graph)
11. [Scripts & Utilities](#scripts--utilities)
12. [Memory Backend System](#memory-backend-system)
13. [Scheduled Tasks & Triggers](#scheduled-tasks--triggers)
14. [Configuration Reference](#configuration-reference)
15. [Common Workflows](#common-workflows)
16. [Troubleshooting](#troubleshooting)

---

## What is afterburn?

afterburn is an **institutional memory tool with pattern recognition** that surfaces warnings when a pull request touches code that caused past production incidents. It solves the "last-mile problem" of post-mortems: teams write excellent post-mortems, but the lessons are never connected to code at PR time.

### How it works

```
post-mortem text → [ingest] → [extract ontology] → [build causal graph] → warnings at PR time
```

1. **Ingests post-mortems** from GitHub repos or uploaded files
2. **Builds a causal knowledge graph** linking root causes, mitigations, services, and code paths
3. **Detects patterns** — hot zones, recurring causes, band-aid mitigations
4. **Checks PRs** and routes warnings through a tiered system (jnr → snr → architect)
5. **Self-audits** nightly/weekly to update confidence weights

### Key design principles

- **Never auto-blocks** — posts comments, engineers decide
- Built on the [gitagent v0.1.0](https://www.gitagent.sh/) open standard
- Default memory backend is [Cognis by Lyzr](https://memory.studio.lyzr.ai)
- Pluggable memory adapters (filesystem, SQLite, S3)

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Required? | Purpose |
|------|---------|-----------|---------|
| **Node.js** | ≥ 18.x | ✅ Yes | Runtime for Next.js and agent scripts |
| **npm** | ≥ 9.x | ✅ Yes | Package management |
| **Git** | ≥ 2.x | ✅ Yes | Cloning repos for ingestion |
| **PowerShell** | ≥ 5.x | ⚠️ Windows | Running `.ps1` demo scripts |
| **gitclaw** | latest | ❌ Optional | CLI REPL for the `ask` skill |
| **gitagent** | latest | ❌ Optional | Full agent orchestration |

### Verifying prerequisites

```powershell
node --version          # Should be ≥ 18.x
npm --version           # Should be ≥ 9.x
git --version           # Should be ≥ 2.x
```

### Optional tools (for CLI demo)

```powershell
npm install -g gitclaw
npm install -g @open-gitagent/gitagent
```

---

## Project Structure

```
afterburn/
├── .env.local                    # Local environment variables (gitignored)
├── .gitignore                    # Git ignore rules
├── LICENSE                       # MIT license
├── README.md                     # Project overview
├── SOUL.md                       # AI agent identity prompt
├── FUTURE.md                     # Post-v0.2 roadmap directions
├── agent.yaml                    # Root-level gitagent config (auto-generated)
├── next.config.mjs               # Next.js configuration
├── package.json                  # Node.js dependencies & scripts
├── postcss.config.mjs            # PostCSS → Tailwind pipeline
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript compiler options
│
├── app/                          # ─── Next.js App Router ────────────────
│   ├── layout.tsx                #   Root HTML layout, metadata, fonts
│   ├── page.tsx                  #   Main dashboard page (client component)
│   ├── globals.css               #   Global CSS + Tailwind imports
│   ├── favicon.ico               #   App favicon
│   ├── fonts/                    #   Geist Sans & Mono local fonts
│   └── api/                      #   ─── API Routes ─────────────────────
│       ├── add-repo/route.ts     #     POST: Clone repo & ingest post-mortems
│       ├── check/route.ts        #     POST: Run diff against the graph
│       ├── graph/route.ts        #     GET:  Serve the causal graph as JSON
│       └── sample-diff/route.ts  #     GET:  Serve the sample diff file
│
├── components/                   # ─── React Components ─────────────────
│   ├── Header.tsx                #   Sticky top bar with model selector
│   ├── ModelSelector.tsx         #   LLM provider toggle (Anthropic/OpenAI/Groq)
│   ├── ConnectRepo.tsx           #   Repo URL input + ingestion results
│   ├── GraphView.tsx             #   Force-directed graph visualization
│   ├── NodePanel.tsx             #   Side panel for node inspection
│   ├── AskAfterburn.tsx          #   Diff textarea + check results
│   ├── StatusPill.tsx            #   Colored status badge component
│   └── TierBadge.tsx             #   PR check tier indicator (jnr/snr/architect)
│
├── lib/                          # ─── Shared TypeScript Utilities ───────
│   ├── types.ts                  #   Type definitions (Model, GraphData, etc.)
│   └── diff-snippet.ts           #   Diff parsing and snippet extraction
│
├── agent/                        # ─── gitagent Agent System ────────────
│   ├── agent.yaml                #   Main agent manifest (skills, tools, agents)
│   ├── ARCHITECTURE.md           #   Full system architecture documentation
│   ├── AGENTS.md                 #   Sub-agent index and responsibilities
│   ├── BUILD_BRIEF.md            #   Original build specification
│   ├── DUTIES.md                 #   Agent duty assignments
│   ├── INSTRUCTIONS.md           #   Operating instructions
│   ├── RULES.md                  #   Agent behavioral constraints
│   ├── SOUL.md                   #   Agent identity and persona
│   ├── .env.example              #   Annotated environment template
│   ├── scheduler.yml             #   Cron schedules & event triggers
│   │
│   ├── agents/                   #   ─── 9 Sub-agents ──────────────────
│   │   ├── ingestor/             #     Fetches raw post-mortem text
│   │   ├── extractor/            #     Ontology extraction from text
│   │   ├── cartographer/         #     Writes to the causal graph
│   │   ├── oracle/               #     PR check router (read-only)
│   │   ├── jnr-oracle/           #     Zero-match tier (silent pass)
│   │   ├── snr-oracle/           #     1-2 match tier (cited warning)
│   │   ├── architect-oracle/     #     Multi-hop tier (chain analysis)
│   │   ├── scribe/               #     Distills patterns → lessons
│   │   └── self-reviewer/        #     Nightly/weekly confidence audits
│   │
│   ├── skills/                   #   ─── 9 Skills ──────────────────────
│   │   ├── ask/                  #     Natural-language REPL interface
│   │   ├── batch-ingest/         #     Bulk ingestion of post-mortems
│   │   ├── check-pr/             #     PR diff checking logic
│   │   ├── distill-lesson/       #     Pattern → lesson distillation
│   │   ├── export-memory/        #     Memory backend export
│   │   ├── extract-ontology/     #     Text → structured nodes/edges
│   │   ├── ingest-incident/      #     Single incident ingestion
│   │   ├── reconcile-graph/      #     Graph merge and deduplication
│   │   └── self-review/          #     Confidence weight updates
│   │
│   ├── skillflows/               #   ─── 4 Skillflows (pipelines) ──────
│   │   ├── ingest-incident.yaml  #     ingest → extract → reconcile → distill
│   │   ├── pr-check.yaml         #     check → log
│   │   ├── self-review.yaml      #     review → log
│   │   └── bootstrap-from-cognis.yaml  # preflight → batch-ingest → log
│   │
│   ├── tools/                    #   ─── 11 Tools ──────────────────────
│   │   ├── file-read.yaml        #     Read files from disk
│   │   ├── file-write.yaml       #     Write files (atomic)
│   │   ├── github-client.yaml    #     GitHub API interactions
│   │   ├── graph-query.yaml      #     Query the causal graph
│   │   ├── memory-backend.yaml   #     Universal memory interface
│   │   ├── memory-cognis.yaml    #     Cognis adapter
│   │   ├── memory-filesystem.yaml #    Filesystem adapter
│   │   ├── memory-sqlite.yaml    #     SQLite adapter
│   │   ├── memory-s3.yaml        #     S3 adapter
│   │   ├── ontology-extractor.yaml #   LLM-based ontology extraction
│   │   ├── sandbox-runner.yaml   #     Sandboxed code execution
│   │   └── scripts/              #     Tool implementation scripts
│   │       ├── ingest-repo.mjs   #       Repo cloning + post-mortem scan
│   │       ├── check-pr-runner.mjs #     PR check execution engine
│   │       ├── graph-query.mjs   #       Graph query implementation
│   │       ├── ontology-extractor.mjs #  LLM ontology extraction
│   │       ├── github-client.mjs #       GitHub API client
│   │       └── file-read.mjs     #       File reading utility
│   │
│   ├── knowledge/                #   ─── Knowledge Graph Store ─────────
│   │   ├── incident-graph.json   #     THE causal graph (63 nodes, 83 edges)
│   │   ├── index.yaml            #     Knowledge directory index
│   │   ├── schema/               #     Graph schema definitions
│   │   │   ├── nodes.yaml        #       12 node type definitions
│   │   │   └── edges.yaml        #       9 edge type definitions
│   │   └── patterns/             #     Pattern detection rules
│   │       ├── band-aid-signatures.yaml  # Band-aid detection
│   │       ├── hot-zones.yaml            # Hot zone detection (≥3 incidents)
│   │       └── recurring-causes.yaml     # Recurring root cause detection
│   │
│   ├── examples/                 #   ─── Example Data ──────────────────
│   │   ├── sample-incident/      #     Fictional post-mortem
│   │   └── sample-pr/            #     Sample PR diff + expected warning
│   │
│   ├── compliance/               #   ─── Regulatory Compliance ─────────
│   │   ├── regulatory-map.yaml   #     Regulatory mapping
│   │   ├── risk-assessment.md    #     Risk assessment document
│   │   └── validation-schedule.yaml #   Validation schedule
│   │
│   ├── hooks/                    #   ─── Lifecycle Hooks ────────────────
│   │   ├── hooks.yaml            #     Hook definitions
│   │   ├── bootstrap.md          #     Bootstrap procedure
│   │   └── teardown.md           #     Teardown procedure
│   │
│   ├── memory/                   #   ─── Agent Memory ──────────────────
│   │   ├── MEMORY.md             #     Memory design documentation
│   │   └── runtime/              #     Runtime state (gitignored)
│   │
│   └── workspace/                #   Agent workspace directory
│
├── scripts/                      # ─── Utility Scripts ──────────────────
│   ├── cli-demo.ps1              #   PowerShell CLI demo launcher
│   ├── smoke-test-api.mjs        #   API endpoint smoke tests
│   ├── take-screenshots.mjs      #   UI screenshot automation
│   └── screenshot-with-panel.mjs #   Screenshot with panel open
│
├── memory/                       # ─── Top-level Memory ─────────────────
│   └── MEMORY.md                 #   Memory placeholder
│
├── public/                       # ─── Static Assets ────────────────────
│   ├── screenshot-graph.png      #   Graph visualization screenshot
│   └── screenshot-warning.png    #   Warning UI screenshot
│
└── workspace/                    # ─── Workspace (empty) ────────────────
```

---

## Environment Setup

### Step 1: Create your environment file

The project uses `.env.local` for the Next.js frontend. Copy and configure it:

```powershell
# The file already exists at the project root
# Edit it with your actual API keys
```

### Required variables in `.env.local`

```env
# ── LLM Provider (pick at least one) ─────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-your-key-here     # For Anthropic models
GROQ_API_KEY=gsk_your-key-here             # For Groq models (default provider)
# OPENAI_API_KEY=sk-...                    # For OpenAI models (optional)

# ── Provider selection ────────────────────────────────────────────────────
LLM_PROVIDER=groq                          # Which provider to use: groq | anthropic | openai

# ── Ingestion pacing ─────────────────────────────────────────────────────
AFTERBURN_INGEST_PACE_MS=15000             # Delay between LLM calls during ingestion (ms)
                                           # Prevents rate limiting on free-tier APIs
```

### For the agent system (optional)

If you plan to use the full gitagent pipeline, also configure `agent/.env`:

```powershell
cd agent
copy .env.example .env
# Then edit agent/.env with your values
```

Key agent variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `GITHUB_TOKEN` | For PR checks | GitHub API access |
| `AFTERBURN_MEMORY_BACKEND` | No (default: `cognis`) | Memory adapter |
| `LYZR_API_KEY` | If using Cognis | Lyzr authentication |
| `COGNIS_OWNER_ID` | If using Cognis | Cognis namespace |

---

## Installation & Running

### Step 1: Install dependencies

```powershell
cd C:\Users\Vivan Rajath\Desktop\afterburn
npm install
```

This installs all dependencies defined in `package.json`:

| Dependency | Version | Purpose |
|------------|---------|---------|
| **next** | 14.2.35 | React framework with App Router |
| **react** | ^18 | UI library |
| **react-dom** | ^18 | React DOM renderer |
| **react-force-graph-2d** | ^1.29.1 | 2D force-directed graph visualization |
| **tailwindcss** | ^3.4.1 | Utility-first CSS framework |
| **typescript** | ^5 | Type safety |
| **playwright** | ^1.60.0 | Browser automation (screenshots) |
| **eslint** | ^8 | Code linting |

### Step 2: Run the development server

```powershell
npm run dev
```

This starts the Next.js dev server. Open your browser to:

```
http://localhost:3000
```

### Step 3: (Optional) Build for production

```powershell
npm run build
npm run start
```

### All available npm scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Start development server with hot reload |
| `build` | `next build` | Create production build |
| `start` | `next start` | Serve production build |
| `lint` | `next lint` | Run ESLint |
| `demo:cli` | `powershell -File scripts/cli-demo.ps1` | Launch gitclaw REPL |

---

## Web Application (Next.js Frontend)

The web app is a single-page Next.js 14 application using the App Router.

### Tech stack

- **Framework**: Next.js 14.2.35 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **Fonts**: Geist Sans + Geist Mono (local `.woff` files)
- **Graph**: react-force-graph-2d (d3-force based)

### Page architecture

The entire UI lives in a single page (`app/page.tsx`) with four main sections:

```
┌─────────────────────────────────────────────────────┐
│  Header  [afterburn]            [Anthropic|OpenAI|Groq] │
├─────────────────────────────────────────────────────┤
│  ConnectRepo                                         │
│  [https://github.com/PostHog/post-mortems] [Add]     │
│  [2 post-mortems] [63 nodes] [83 edges] [⚡ band-aid]│
├─────────────────────────────────────────────────────┤
│  GraphView                                           │
│  ┌─────────────────────────────┬──────────┐         │
│  │   Force-directed graph      │ NodePanel │         │
│  │   (dark canvas)             │ (details) │         │
│  │   • Color-coded by type     │           │         │
│  │   • Click to inspect        │           │         │
│  │   • Hover for tooltips      │           │         │
│  └─────────────────────────────┴──────────┘         │
│  [Legend: Service | Code path | Incident | ...]      │
├─────────────────────────────────────────────────────┤
│  AskAfterburn                                        │
│  ┌──────────────────────────────────────────┐        │
│  │ Paste a unified diff here...             │        │
│  └──────────────────────────────────────────┘        │
│  [Load sample PR diff] [Check] [Clear]               │
│  ┌──────────────────────────────────────────┐        │
│  │ [DEEP PATTERN DETECTED]                  │        │
│  │ Warning text from the LLM...             │        │
│  │ Powered by gitclaw · Model: groq · 850ms │        │
│  └──────────────────────────────────────────┘        │
├─────────────────────────────────────────────────────┤
│  Footer — Built on gitagent                          │
└─────────────────────────────────────────────────────┘
```

### State management

The page manages these state variables (all via `useState`):

| State | Type | Purpose |
|-------|------|---------|
| `selectedModel` | `'anthropic' \| 'openai' \| 'groq'` | Current LLM provider |
| `repoState` | `{ ready: false } \| { ready: true; stats }` | Repo connection status |
| `graphData` | `GraphData \| null` | Nodes + links for the graph |
| `selectedNodeId` | `string \| null` | Currently inspected node |
| `lastCheckResult` | `CheckResult \| null` | Last PR check result |
| `showStaleBanner` | `boolean` | Show "stale data" banner |
| `diff` | `string` | Current diff text |
| `staleHighlight` | `boolean` | Highlights are outdated |

### Data flow

```
User enters repo URL
  → ConnectRepo.handleConnect()
    → POST /api/add-repo { url }
      → spawnIngest() — clones repo, scans for post-mortems
        → ontology-extractor.mjs — LLM extracts nodes/edges
          → Writes to incident-graph.json
      → Returns { post_mortems_found, graph_node_count, ... }
    → page.tsx.handleRepoSuccess()
      → GET /api/graph?repo_id=demo
        → Reads incident-graph.json
        → Returns { nodes, links }
      → setGraphData() → GraphView renders

User pastes diff and clicks Check
  → AskAfterburn.handleCheck()
    → POST /api/check { diff, model }
      → check-pr-runner.mjs
        → Reads graph, matches diff paths, calls LLM
        → Returns { tier, warning, matched_node_ids, ... }
    → page.tsx.handleResult()
      → GraphView highlights matched nodes
      → AskAfterburn shows warning card
```

---

## API Routes

### `POST /api/add-repo`

**Purpose**: Clone a GitHub repo, scan for post-mortem markdown files, extract ontology, and build/update the causal graph.

**Request**:
```json
{ "url": "https://github.com/PostHog/post-mortems" }
```

**Response (success)**:
```json
{
  "repo_url": "https://github.com/PostHog/post-mortems",
  "status": "ready",
  "post_mortems_found": 2,
  "files": ["incident-1.md", "incident-2.md"],
  "graph_node_count": 63,
  "graph_edge_count": 83,
  "band_aid_count": 3,
  "hot_zone_count": 0,
  "duration_ms": 45000
}
```

**How it works**:
1. Validates URL matches `https://github.com/<owner>/<repo>`
2. Creates a temp directory in `os.tmpdir()` with a SHA1 hash suffix
3. Spawns `node agent/tools/scripts/ingest-repo.mjs` as a child process
4. Timeout: 120 seconds
5. Parses the last line of stdout as JSON summary
6. Cleans up the temp directory

---

### `POST /api/check`

**Purpose**: Run a diff against the causal graph and get a tiered warning.

**Request**:
```json
{
  "diff": "diff --git a/src/payments/handler.py ...",
  "model": "anthropic"
}
```

**Response**:
```json
{
  "warning": "⚠ This PR touches src/payments/handler.py...",
  "tier": "architect",
  "lessons_cited": ["LES-2024-001"],
  "matched_node_ids": ["code-path:src-payments-handler-py", "incident:3310de46aa7d"],
  "model_used": "anthropic",
  "elapsed_ms": 1200
}
```

**Tier routing**:

| Tier | Condition | Response |
|------|-----------|----------|
| `jnr` | 0 past incidents match | Silent pass |
| `snr` | 1-2 matches or hot zone (≥3 incidents) | Cited warning |
| `architect` | Multi-hop causal pattern | Full chain analysis |

**Provider → Model mapping**:

| Provider | Model | API Key Env Var |
|----------|-------|-----------------|
| `anthropic` | `claude-haiku-4-5-20251001` | `ANTHROPIC_API_KEY` |
| `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` |
| `groq` | `llama-3.1-8b-instant` | `GROQ_API_KEY` |

---

### `GET /api/graph?repo_id=demo`

**Purpose**: Serve the causal knowledge graph in a format compatible with react-force-graph-2d.

**Response**:
```json
{
  "nodes": [
    { "id": "incident:7efe43803f3e", "name": "...", "group": 3, "type": "Incident", "val": 8, "properties": {} }
  ],
  "links": [
    { "source": "incident:7efe43803f3e", "target": "service:posthog-js", "type": "caused", "properties": {} }
  ]
}
```

**Node group → color mapping**:

| Group | Type | Color |
|-------|------|-------|
| 1 | Service | Blue `#3b82f6` |
| 2 | CodePath | Emerald `#10b981` |
| 3 | Incident | Red `#ef4444` |
| 4 | RootCause / Error / Symptom | Orange `#f97316` |
| 5 | Mitigation | Gray `#6b7280` |
| 6 | Lesson | Purple `#8b5cf6` |
| 7 | Pattern | Yellow `#eab308` |

---

### `GET /api/sample-diff`

**Purpose**: Serve the built-in sample diff file for one-click demo.

**Source**: `agent/examples/sample-pr/diff.patch`

---

## Components Deep Dive

### `Header.tsx`
Sticky dark header bar. Contains the app name "afterburn" and the `ModelSelector` toggle.

### `ModelSelector.tsx`
Three-button toggle to switch between LLM providers: **Anthropic**, **OpenAI**, **Groq**. The selected provider is passed to `/api/check` for PR analysis.

### `ConnectRepo.tsx`
- Text input pre-filled with `https://github.com/PostHog/post-mortems`
- "Add afterburn" button triggers `POST /api/add-repo`
- Shows a spinner during the 30–90 second ingestion process
- On success: displays `StatusPill` badges for post-mortems found, nodes, edges, band-aids, hot zones
- On no post-mortems: shows an amber warning banner
- On error: shows a rose error banner with retry button

### `GraphView.tsx`
The core visualization component. Features:

- **Force-directed 2D graph** via `react-force-graph-2d` (dynamically imported, no SSR)
- **Custom canvas rendering** (`paintNode`) with:
  - Color-coded nodes by group
  - Pulsing red border on band-aid candidate nodes (`Math.sin(Date.now() * 0.003)`)
  - Glow effect on selected nodes
  - Labels on hover/selection
- **Diff-aware highlighting**: when a check result exists, matched nodes render at full opacity; unmatched nodes dim to 25%
- **Stale-diff handling**: if the diff changes after a check, matched nodes drop to 50% opacity
- **Rich hover tooltips**:
  - CodePath nodes: show the matching diff hunk with syntax highlighting
  - Incident nodes: show title, summary, and touched code path snippets
  - Other nodes: show type and name
- **NodePanel sidebar**: opens on node click for detailed inspection
- **Legend strip**: at the bottom, showing all 7 node type colors

### `NodePanel.tsx`
Side panel that opens when a graph node is clicked. Two modes:

1. **Incident nodes**: Rich display with title, severity, status, relative time, description (collapsible), touched files list, resolved-by mitigations, band-aid pattern warning
2. **All other nodes**: Properties grid, related incidents (for Pattern), causes (for RootCause)

### `AskAfterburn.tsx`
- Textarea for pasting unified diffs
- "Load sample PR diff" button (fetches from `/api/sample-diff`)
- "Check" button sends `POST /api/check`
- Results display:
  - `TierBadge` showing the routing tier
  - Lessons cited
  - Warning text in monospace
  - Footer with model used and response time

### `StatusPill.tsx`
Reusable pill-shaped badge with four variants: `neutral`, `warning`, `danger`, `success`.

### `TierBadge.tsx`
Uppercase badge for PR check tiers:
- `jnr` → green "NO WARNING"
- `snr` → amber "STANDARD WARNING"
- `architect` → rose "DEEP PATTERN DETECTED"

---

## Agent System (gitagent)

afterburn is a native [gitagent v0.1.0](https://www.gitagent.sh/) agent. The agent system lives entirely under `agent/`.

### Agent manifest (`agent/agent.yaml`)

```yaml
spec_version: "0.1.0"
name: afterburn
version: "0.1.0"
model:
  preferred: "groq:llama-3.3-70b-versatile"
  fallback:
    - "anthropic:claude-sonnet-4-5-20250929"
    - "openai:gpt-4o"
skills: [9 skills]
tools: [11 tools]
agents: [9 sub-agents]
runtime:
  max_turns: 30
  timeout: 300
```

### The 9 Sub-Agents

#### Ingestion Pipeline

| Agent | Model | Responsibility |
|-------|-------|---------------|
| **ingestor** | claude-haiku | Fetch raw text from URLs or files |
| **extractor** | claude-sonnet | Extract structured nodes/edges per schema |
| **cartographer** | claude-sonnet | Write to the graph; detect band-aid patterns |

#### PR Check Pipeline

| Agent | Model | Responsibility |
|-------|-------|---------------|
| **oracle** | claude-haiku | Read-only router; dispatches to tiers |
| **jnr-oracle** | claude-haiku | Zero-match: log skip |
| **snr-oracle** | claude-sonnet | 1-2 match/hot zone: cited warning |
| **architect-oracle** | claude-opus | Multi-hop: full chain analysis |

#### Memory & Learning

| Agent | Model | Responsibility |
|-------|-------|---------------|
| **scribe** | claude-sonnet | Distill patterns into lessons |
| **self-reviewer** | claude-sonnet | Confidence updates; weekly replay |

### The 4 Skillflows (Pipelines)

| Skillflow | Steps | Trigger |
|-----------|-------|---------|
| `ingest-incident` | ingest → extract → reconcile → distill → log | `incident.created` or manual |
| `pr-check` | check → log | `pull_request.opened` or manual |
| `self-review` | review → log | Nightly 02:00 / Weekly Sun 09:00 |
| `bootstrap-from-cognis` | preflight → batch-ingest → log | Manual |

### The 11 Tools

| Tool | Purpose |
|------|---------|
| `file-read` | Read files from disk |
| `file-write` | Atomic file writes (write-then-rename) |
| `github-client` | GitHub API (diffs, comments, issues) |
| `graph-query` | Query the causal knowledge graph |
| `memory-backend` | Universal memory interface (5 methods) |
| `memory-cognis` | Cognis (Lyzr) adapter |
| `memory-filesystem` | Local filesystem adapter |
| `memory-sqlite` | SQLite FTS5 adapter |
| `memory-s3` | AWS S3 adapter |
| `ontology-extractor` | LLM-based ontology extraction |
| `sandbox-runner` | Sandboxed code execution (self-reviewer only) |

---

## Causal Knowledge Graph

The graph lives at `agent/knowledge/incident-graph.json`. It is the **single source of truth** for pattern detection and tier routing.

### Current state

- **Version**: 0.1.0
- **Nodes**: ~63 (seeded from PostHog post-mortems)
- **Edges**: ~83
- **Band-aid candidates**: Multiple incidents flagged

### Node Types (12)

| Type | ID Format | Example |
|------|-----------|---------|
| Service | `service:<slug>` | `service:posthog-js` |
| Error | `error:<slug>` | `error:redis-overload` |
| Trigger | `trigger:<slug>-<date>` | `trigger:customer-report` |
| RootCause | `root-cause:<slug>` | `root-cause:cpu-undersizing` |
| Symptom | `symptom:<slug>` | `symptom:connection-pool-exhaustion` |
| Mitigation | `mitigation:<slug>-<date>` | `mitigation:cpu-right-sizing` |
| CodePath | `code-path:<file-path>` | `code-path:src-payments-handler-py` |
| Incident | `incident:<id>` | `incident:7efe43803f3e` |
| Lesson | `lesson:<LES-YYYY-NNN>` | `lesson:LES-2024-001` |
| Pattern | `pattern:<type>:<key>` | `pattern:hot-zone:payments` |
| Hook | `hook:<name>` | `hook:pre-check` |
| SkillFlow | `skillflow:<name>` | `skillflow:ingest-incident` |

### Edge Types (9)

| Edge | Source → Target | Meaning |
|------|----------------|---------|
| `caused` | RootCause → Service/Error/Symptom | Direct causal link |
| `manifested_as` | Error → Symptom | Observable surface |
| `resolved` | Mitigation → RootCause/Incident | Stopped the incident |
| `touched` | Incident → CodePath | Files involved |
| `depended_on` | Service → Service | Runtime dependency |
| `satisfies` | Mitigation → RootCause | **Permanently addressed** the root cause |
| `references` | Lesson → Incident/Pattern | Citation |
| `prevented_by` | RootCause → Mitigation | Future prevention |
| `learned_from` | Pattern → Incident | Pattern evidence |

### Band-Aid Pattern Detection

A mitigation is flagged as a **band-aid** when it has a `resolved` edge but **no** `satisfies` edge. This means the incident was stopped but the root cause was never permanently addressed.

```
mitigation:add-webhook-events-index
    │ resolved
    └──► incident:PAY-2024-031501
    (no satisfies edge → band_aid_candidate: true)
```

### Pattern Detection Rules

Defined in `agent/knowledge/patterns/`:

- **`band-aid-signatures.yaml`**: Mitigations that resolved without satisfying
- **`hot-zones.yaml`**: Code paths touched by ≥3 distinct incidents
- **`recurring-causes.yaml`**: Root causes that reappear across incidents

---

## Scripts & Utilities

### `scripts/cli-demo.ps1`

Launches the gitclaw REPL for natural-language queries against the graph.

```powershell
npm run demo:cli
```

**Prerequisites**: `ANTHROPIC_API_KEY` set, `gitclaw` installed globally.

**Sample prompts**:
- `list incidents` — summarize what's in the graph
- `tell me about the payment processor incidents`
- `what would happen if I changed src/payments/handler.py?`
- `what can you do?`

### `scripts/smoke-test-api.mjs`

Automated API smoke test. Tests all three main endpoints:

```powershell
# Start the dev server first, then in another terminal:
node scripts/smoke-test-api.mjs
```

Tests:
1. `POST /api/add-repo` → expects `status: "ready"`
2. `GET /api/graph?repo_id=demo` → expects `nodes.length > 0`
3. `POST /api/check` with sample diff → expects `tier: "architect"`

### `scripts/take-screenshots.mjs` & `scripts/screenshot-with-panel.mjs`

Playwright-based screenshot automation for documentation. Captures the graph view and warning panels.

---

## Memory Backend System

All memory operations go through `tools/memory-backend.yaml` — a universal interface with 5 methods:

```yaml
save_incident(id, raw_text, metadata)    → { id, backend }
save_lesson(id, body, confidence, metadata) → { id, backend }
search(query, scope, limit)              → { records[], backend }
get(id)                                  → { id, raw_text, metadata, backend }
list(scope, cursor, limit)               → { records[], next_cursor, backend }
```

### Available Adapters

| Adapter | Backend | Semantic Ranking | Setup |
|---------|---------|-----------------|-------|
| **cognis** (default) | Lyzr Cognis | Server-side | `LYZR_API_KEY` + `COGNIS_OWNER_ID` |
| **filesystem** | Local files | Term frequency | `AFTERBURN_FS_ROOT` |
| **sqlite** | SQLite FTS5 | FTS5 rank | `AFTERBURN_SQLITE_PATH` |
| **s3** | AWS S3 | Term frequency | `AFTERBURN_S3_BUCKET` + AWS creds |

Switch with: `AFTERBURN_MEMORY_BACKEND=filesystem` (then run `bootstrap-from-cognis` to rebuild).

---

## Scheduled Tasks & Triggers

Defined in `agent/scheduler.yml`:

### Recurring Schedules

| Schedule | Cron | Purpose |
|----------|------|---------|
| `nightly-self-review` | `0 2 * * *` (02:00 UTC daily) | Audit past warnings, update confidence |
| `weekly-summary` | `0 9 * * 0` (09:00 UTC Sunday) | Full replay, detection/FP rate computation |

### Event Triggers

| Trigger | Event | Pipeline |
|---------|-------|----------|
| `incident-created` | `incident.created` | Full ingestion pipeline |
| `pull-request-opened` | `pull_request.opened` | PR check pipeline |

> **Note**: `pull_request.synchronized` is intentionally excluded in v0.1 to avoid noise before self-review has tuned false-positive rates.

---

## Configuration Reference

### Root `.env.local`

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ANTHROPIC_API_KEY` | ⚠️ For Anthropic | — | Anthropic API authentication |
| `GROQ_API_KEY` | ⚠️ For Groq | — | Groq API authentication |
| `OPENAI_API_KEY` | ❌ Optional | — | OpenAI API authentication |
| `LLM_PROVIDER` | ❌ | `groq` | Default LLM provider |
| `AFTERBURN_INGEST_PACE_MS` | ❌ | `15000` | Delay between LLM calls during ingestion |

### Agent `.env` (`agent/.env.example`)

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `GITHUB_TOKEN` | For PR checks | — | GitHub API access |
| `AFTERBURN_MEMORY_BACKEND` | No | `cognis` | Active memory adapter |
| `LYZR_API_KEY` | If cognis | — | Lyzr authentication |
| `COGNIS_OWNER_ID` | If cognis | — | Cognis namespace |
| `COGNIS_API_URL` | No | `https://memory.studio.lyzr.ai` | Cognis endpoint |
| `AFTERBURN_FS_ROOT` | If filesystem | — | Root dir for file adapter |
| `AFTERBURN_SQLITE_PATH` | If sqlite | — | SQLite database path |
| `AFTERBURN_S3_BUCKET` | If s3 | — | S3 bucket name |
| `AFTERBURN_S3_REGION` | If s3 | — | S3 region |
| `AWS_ACCESS_KEY_ID` | If s3 | — | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | If s3 | — | AWS credentials |

---

## Common Workflows

### Workflow 1: Quick Demo (Web UI)

```powershell
# 1. Set your API key
# Edit .env.local → set GROQ_API_KEY (or ANTHROPIC_API_KEY)

# 2. Install & run
npm install
npm run dev

# 3. Open http://localhost:3000
# 4. Click "Add afterburn" (default repo: PostHog/post-mortems)
# 5. Wait 30-90 seconds for ingestion
# 6. Explore the causal graph
# 7. Click "Load sample PR diff" → Click "Check"
# 8. See the tiered warning
```

### Workflow 2: CLI Demo (gitclaw REPL)

```powershell
# 1. Set ANTHROPIC_API_KEY in your environment
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# 2. Install gitclaw
npm install -g gitclaw

# 3. Run the demo
npm run demo:cli

# 4. Try: "list incidents", "what can you do?"
```

### Workflow 3: Full Agent Pipeline (gitagent)

```powershell
# 1. Configure agent/.env
cd agent
copy .env.example .env
# Edit .env with your keys

# 2. Ingest a post-mortem
gitagent run skillflows/ingest-incident.yaml `
  --input source_url=https://github.com/your-org/your-repo/issues/42

# 3. Check a PR
gitagent run skillflows/pr-check.yaml `
  --input repo=your-org/your-repo `
  --input pr_number=88

# 4. Bootstrap from memory backend
gitagent run skillflows/bootstrap-from-cognis.yaml
```

### Workflow 4: Windows Bootstrap Scripts

```powershell
# Verify environment and seed graph
.\agent\scripts\bootstrap.ps1

# Run the full demo with sample data
.\agent\scripts\run-demo.ps1
```

### Workflow 5: Running Smoke Tests

```powershell
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Run the smoke tests
node scripts/smoke-test-api.mjs
```

---

## Troubleshooting

### "API key for anthropic not set"
Set the appropriate API key in `.env.local`. The `/api/check` endpoint checks for the key matching the selected model provider.

### Ingestion timeout (120s)
Large repos may exceed the 120-second timeout. Try a smaller repo or increase the timeout in `app/api/add-repo/route.ts` (line 27).

### "No post-mortem files found"
The ingestion script scans for markdown files that look like post-mortems. If the repo doesn't contain recognizable post-mortem files, you'll get a warning. The previously ingested graph data (from PostHog) will still be shown.

### Rate limiting during ingestion
If using free-tier API keys (especially Groq), the `AFTERBURN_INGEST_PACE_MS=15000` adds a 15-second delay between LLM calls. Increase this value if you hit rate limits.

### Graph shows 0 nodes
Ensure the ingestion completed successfully. Check that `agent/knowledge/incident-graph.json` has content. The file ships pre-seeded with PostHog incident data.

### "spawn error: ENOENT"
Ensure `node` and `git` are in your system PATH. The API routes spawn child processes that need both.

### TypeScript errors
Run `npx tsc --noEmit` to check for type errors. The project uses strict mode.

### Port 3000 in use
Next.js will automatically try port 3001 if 3000 is occupied, or specify: `npx next dev -p 3001`.

---

> **License**: MIT — see [LICENSE](LICENSE)
>
> **Repository**: github.com/VivanRajath/afterburn
>
> **Built on**: [gitagent v0.1.0](https://www.gitagent.sh/) · [Cognis by Lyzr](https://memory.studio.lyzr.ai)
