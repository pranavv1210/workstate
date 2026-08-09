# WorkState

**AI agents are replaceable. Your engineering context isn't.**

Your AI conversation can end. Your engineering work doesn't.

WorkState is a local-first engineering context layer for developers working with AI coding agents. It preserves the important context that should survive AI chat changes, context-window limits, VS Code restarts, working sessions, time away from a project, and switching between tools.

WorkState is not a task manager, not another AI coding agent, not an AI chat client, and not a cloud memory service. It exists to remember where your engineering work left off.

## The Problem

A developer works with Codex for two hours. The conversation understands what they are building, what they discovered, what changed, what failed, what was decided, and what remains.

Then the conversation ends.

The developer starts a new Codex conversation, switches to Claude, opens GitHub Copilot, or tries Gemini. The new AI session does not automatically have the previous session's context, so the developer has to explain everything again.

The conversation is temporary. The engineering context should persist.

## The Solution

WorkState stores useful engineering context locally for the current workspace and turns it into concise continuation context when you need it.

```text
WORK NORMALLY
      |
      v
WORKSTATE REMEMBERS IMPORTANT CONTEXT
      |
      v
AI CHAT ENDS / CONTEXT CHANGES
      |
      v
OPEN NEW AI SESSION
      |
      v
CONTINUE WORK
      |
      v
NEW AI SESSION UNDERSTANDS THE IMPORTANT CONTEXT
```

The product philosophy is:

> You don't manage WorkState. WorkState understands your work.

## Why WorkState?

AI coding agents are powerful, but their context is usually tied to one chat, one provider, or one session. WorkState keeps the engineering context independent from the AI agent you happen to be using.

It helps answer:

- What was I working on?
- What did I already finish?
- What did I decide?
- What should I not repeat?
- What files matter?
- What was I about to do next?

The goal is simple:

Developer: "I forgot where I left off."

WorkState: "I remember."

## Works With Your AI Coding Workflow

WorkState is designed to sit above your AI coding agents rather than replace them.

It is intended to work alongside:

- OpenAI Codex
- Claude / Claude Code
- GitHub Copilot
- Gemini
- other AI coding agents
- future AI coding tools

```text
                 WORKSTATE
                     |
          Persistent Context
                     |
       +-------------+-------------+
       v             v             v
     Codex         Claude       Copilot
       v             v             v
     Gemini       Other AI      Future AI
```

Today, WorkState uses provider-independent local context and copy-assisted handoff. It does not claim native automatic integrations with every provider.

## How It Works

1. Work normally in VS Code.
2. Capture important context when something meaningful happens.
3. WorkState stores that context locally for the workspace.
4. Come back later or open a new AI session.
5. Use Continue Work to reconstruct where you left off.
6. Use Handoff to review and copy context into another AI chat.

Current cross-AI examples:

```text
Claude
  -> WorkState Handoff
  -> Copy Context
  -> New Codex Chat
  -> Paste Context
  -> Continue
```

```text
Codex
  -> WorkState
  -> Handoff
  -> Claude
  -> Continue
```

```text
Copilot
  -> WorkState
  -> Handoff
  -> Gemini
  -> Continue
```

This is useful because the important engineering context is stored outside the individual AI conversation.

## Continue Work

Continue Work reconstructs the most relevant stored engineering context for the current workspace.

It can surface:

- what you were working on
- recent progress
- important decisions
- things not to repeat
- next steps
- relevant files
- Git context where available

Continue Work is the primary WorkState experience.

## Capture

Capture is lightweight. It lets you preserve useful engineering context without maintaining a large task form.

Supported capture types include:

- Decision
- Don't Forget
- Completed
- Note
- Blocker
- Test Result
- Next Action

WorkState is context first, forms second. You should spend time coding, not maintaining WorkState.

## Handoff

Handoff creates a compact engineering context package that can be carried into another AI conversation.

```text
OLD AI SESSION
      |
      v
WorkState
      |
      v
Context Handoff
      |
      v
NEW AI SESSION
```

A handoff can include:

- project
- current focus
- what happened
- completed work
- important decisions
- things not to repeat
- recent activity
- relevant files
- Git state
- next step

You can review and copy the generated context before pasting it anywhere.

## Task DNA

Task DNA is the chronological history of meaningful WorkState activity.

It helps answer:

- What happened during this piece of work?
- Why did the work evolve this way?

Current Task DNA is chronological. Advanced graph visualization is not implemented in the current release.

## Persistent Workspace Context

WorkState keeps context locally and associates it with the workspace or project.

```text
JourneySync
  -> JourneySync WorkState context

AquaFlow
  -> AquaFlow WorkState context

Another project
  -> separate WorkState context
```

Contexts are workspace-specific and should not be mixed between projects.

## Git Awareness

Where Git is available, WorkState can use lightweight local Git information such as:

- current branch
- changed files
- recent commits
- working tree state

WorkState does not replace Git. It uses Git as one local signal for reconstructing useful engineering context.

## Notifications

WorkState can use conservative VS Code-native notifications to surface useful context.

Examples:

- Welcome Back: "You were working on..."
- Meaningful Progress: "Looks like you've made meaningful progress."
- Branch / Context Change: "Your project context changed."
- Handoff Ready: "Your WorkState context is ready."

Notifications are designed to be infrequent, actionable, dismissible, and non-blocking. The current implementation uses local heuristics, not AI-powered notification intelligence.

## Privacy / Local-First

WorkState is designed around a local-first architecture:

- no required WorkState account
- no required WorkState cloud
- no required backend
- no required AI API key
- no mandatory telemetry
- workspace context is stored locally
- `.workstate` data is not included in the extension package
- sensitive paths are excluded from relevant-file discovery according to WorkState privacy rules
- Git information is read locally

Project context stays local unless you explicitly copy or share it.

## AI Is Optional

WorkState's core functionality does not require:

- OpenAI API keys
- Anthropic API keys
- Gemini API keys
- Copilot subscription
- WorkState account
- WorkState cloud
- external database

Future AI-assisted capabilities may include context extraction, summarization, suggested memories, suggested decisions, automatic progress understanding, confidence scoring, Review Center, and richer context reconstruction. These are future capabilities unless explicitly shipped in a release.

## Current Capabilities

- context-first WorkState sidebar
- Continue Work
- lightweight Capture
- Decisions and Don't Repeat context
- copy-assisted Handoff
- editable Handoff preview
- Task DNA chronological history
- workspace-specific local persistence
- corrupted-state recovery
- basic Git awareness
- privacy exclusions for sensitive-looking paths
- quiet configurable VS Code notifications
- Command Palette commands
- Quick Capture keyboard shortcut
- About WorkState / creator information

## Current Limitations

- copy-assisted handoff only
- no automatic provider conversation import
- no automatic context injection into Codex, Claude, Copilot, Gemini, or other providers
- no automatic AI extraction or summarization
- no Review Center yet
- no cloud sync
- no team collaboration
- no semantic/vector search
- no Task DNA graph
- no Agent Passport

WorkState does not automatically read every Codex, Claude, Copilot, or Gemini conversation. Deeper provider integrations will be added only where supported APIs make them reliable and appropriate.

## Roadmap

### Current

- persistent local context
- Continue Work
- Capture
- Handoff
- Task DNA
- Git awareness
- privacy controls
- quiet notifications

### Next

- smarter context reconstruction
- intelligent notification improvements
- better session awareness
- stronger workspace-switching UX

### Future

- Review Center
- AI-assisted extraction
- richer Task DNA
- supported provider adapters
- Project Memory
- Agent Passport

No timelines are promised.

## Installation

Install WorkState from the Visual Studio Code Marketplace when the public release is available, or install a generated VSIX during local testing.

## Getting Started

1. Open a project in VS Code.
2. Open the WorkState activity bar item.
3. Capture meaningful context when something important happens.
4. Use Continue Work when you come back.
5. Generate a Handoff when starting a new AI chat.
6. Review, copy, paste, and continue.

## Creator

Created by Pranav.

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

## Releases

GitHub repository updates and Marketplace releases are separate concepts. A push to `main` validates the project, but it does not publish a new Marketplace version unless `package.json` contains a new version and all validation steps pass.

Normal development:

1. Make code changes.
2. Commit.
3. Push to `main`.
4. GitHub Actions validates the project.
5. If the package version did not change, Marketplace publishing is skipped.

Release:

1. Complete the feature or fix.
2. Update `package.json` version.
3. Update `package-lock.json`.
4. Update `CHANGELOG.md`.
5. Commit.
6. Push to `main`.
7. GitHub Actions validates the project.
8. If the new version is greater than the previous commit's version, GitHub Actions publishes it to the Visual Studio Marketplace.

Example:

```text
Current Marketplace version: 0.2.3
Development commit version: 0.2.3 -> no Marketplace publish
Release commit version:     0.2.4 -> automatic Marketplace publish
```

Maintainers must configure this GitHub repository secret before automated publishing can work:

```text
VSCE_PAT
```

`VSCE_PAT` is used only by GitHub Actions to authenticate with the Visual Studio Marketplace publisher `pranavv1210`. Do not commit Marketplace tokens, `.env` files, or credentials to the repository.

## License

MIT
