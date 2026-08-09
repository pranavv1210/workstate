# WorkState

Your AI conversation can end.  
Your engineering work doesn't.

## What Is WorkState?

WorkState is a local-first developer context layer for AI-assisted engineering work.

It is not a task manager. It is not a cloud memory service. WorkState helps preserve what changed, what mattered, what was decided, and where you left off so a fresh AI coding session can continue quickly.

The current product direction is simple:

> You don't manage WorkState. WorkState understands your work.

## The Problem

AI coding sessions end. Context windows fill up. Developers switch between chats, agents, branches, and work sessions.

The same context gets explained again:

- what you were building
- what changed
- what was already completed
- what decisions were made
- what should not be repeated
- what should happen next

## The Solution

WorkState keeps a lightweight local memory of important engineering context.

You work normally, capture meaningful moments when needed, and use Continue Work or Handoff when you want a new AI coding session to understand where the previous one stopped.

## How It Works

1. Work normally in VS Code.
2. Capture important context when something meaningful happens.
3. WorkState stores the context locally for that workspace.
4. Come back later.
5. Continue where you left off.
6. Generate a handoff when starting a new AI session.

## Continue Work

Continue Work reconstructs the current project context from stored WorkState activity and lightweight Git context.

It is designed to answer:

- What was I doing?
- What did I finish?
- What did I decide?
- What should I not repeat?
- What was I about to do?

## Capture

Capture is the fastest way to save something important.

Supported capture types:

- Decision
- Don't Forget / rejected approach
- Completed
- Note
- Blocker
- Test Result
- Next Action

WorkState does not call an AI provider in the current version. The developer chooses the capture type, and that classification becomes trusted local context.

## Handoff

Handoff generates a concise context package for a fresh AI coding session.

Current workflow:

```text
WorkState
  -> Generate context
  -> Review
  -> Copy
  -> New AI chat
  -> Paste
  -> Continue
```

WorkState does not currently inject context directly into Codex, Claude, Copilot, Gemini, or other providers.

## Task DNA

Task DNA is the chronological history of meaningful work events.

Current Task DNA records:

- captures
- completed work
- decisions
- rejected approaches
- blockers
- test results
- handoffs

Future versions may add richer relationships, Git links, search, and visual evolution.

## Notifications

WorkState includes quiet VS Code-native notifications for useful moments such as:

- meaningful previous context restored on workspace reopen
- a meaningful batch of files changed
- Git branch context changed
- handoff context is ready

Notifications are configurable and deduplicated. They are designed to be infrequent, actionable, and dismissible.

## Privacy

WorkState is local-first:

- no WorkState account required
- no backend required
- no required AI API key
- no mandatory telemetry
- no source-code upload
- project context stays local unless you explicitly copy or share it

Workspace state is stored in `.workstate/workstate.json` inside the open workspace. Different workspaces keep separate context.

Common sensitive files such as `.env`, credentials, token files, private keys, and secret-looking paths are excluded from relevant-file handling by default.

## AI

AI is optional.

Current WorkState works without OpenAI, Anthropic, Gemini, Copilot, paid APIs, cloud sync, or a WorkState account.

Planned AI-assisted capabilities may include:

- context extraction
- summarization
- suggested decisions
- suggested completed work
- suggested handoffs
- context compression
- Review Center

These are not required for the current local workflow.

## Supported AI Agents

WorkState can be used with AI coding agents that accept pasted context, including Codex, Claude, Copilot, Gemini, and others.

Current support is copy-assisted handoff. Native provider injection is not implemented unless a future provider offers a supported API.

## Current Limitations

- copy-assisted handoff only
- no automatic provider injection
- no automatic AI extraction
- no Review Center yet
- no cloud sync
- no team collaboration
- no semantic/vector search
- no Task DNA graph
- no Agent Passport

## Roadmap

### Current

- persistent local workspace context
- Continue Work
- Capture
- Handoff
- Task DNA
- basic Git awareness
- privacy exclusions
- quiet configurable notifications

### Next

- smarter context reconstruction
- better session awareness
- improved notification heuristics
- stronger persistence UX around workspace switching

### Future

- Review Center
- AI-assisted extraction
- richer Task DNA
- supported provider adapters
- Project Memory
- Agent Passport

No timelines are promised.

## Creator

WorkState is created by Pranav.

GitHub: [pranavv1210](https://github.com/pranavv1210)

## Development

Install dependencies:

```bash
npm install
```

Compile:

```bash
npm run compile
```

Run tests:

```bash
npm test
```

Lint:

```bash
npm run lint
```

Package a VSIX:

```bash
npm run package
```

Run locally:

1. Open this repository in VS Code.
2. Run `npm install`.
3. Press `F5` to launch an Extension Development Host.
4. Open a folder in the Extension Development Host.
5. Open the WorkState activity bar item.

## License

MIT

