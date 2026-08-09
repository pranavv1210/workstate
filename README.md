# WorkState

**AI agents are replaceable. Your engineering context isn't.**

WorkState is a context-switching layer for AI coding in VS Code. It preserves engineering context across new chats, context-window changes, AI agent switches, VS Code restarts, development sessions, and time away from a project.

WorkState is not a task manager, not another AI coding agent, not an AI chat client, and not a cloud memory service.

## What Is WorkState?

WorkState keeps the important engineering context outside any one AI conversation.

It remembers:

- what you were working on
- what changed
- what was completed
- what was decided
- what should not be repeated
- what failed or blocked progress
- what files matter
- what should happen next

## The Problem

Codex, Claude, Copilot, Gemini, and other AI coding conversations eventually end, become too large, or live inside separate tools. A new chat does not automatically know everything from the old chat. Switching agents often means explaining the same work again.

WorkState preserves the important engineering context so the next session can continue.

## The WorkState Workflow

```text
AI Session
    |
    v
WorkState
    |
    v
Persistent Local Context
    |
    v
New AI Session
    |
    v
Continue
```

## Works With AI Coding Agents

WorkState is provider-independent. It is designed to work alongside:

- OpenAI Codex
- Claude / Claude Code
- GitHub Copilot
- Gemini / Gemini Code Assist
- other AI coding agents

Current support is copy-assisted handoff where direct provider injection is unavailable.

Inside VS Code, WorkState also contributes stable Language Model Tools and an `@workstate` chat participant so supported agent workflows can retrieve project context directly from WorkState.

```text
Codex
  -> WorkState
  -> Context Handoff
  -> Claude
  -> Continue
```

## Context Switching

Use **Continue Work** when you are starting a new chat or switching agents. WorkState reconstructs the current workspace context, asks where you want to continue, prepares the relevant context, and copies it for the target agent.

Direct injection is only used when a stable supported provider API exists. In the current release, provider continuation is agent-tool-assisted where supported by VS Code and copy-assisted everywhere else.

## AI Agent Context Bridge

WorkState exposes local project context through official VS Code AI extension points:

- Language Model Tools for supported agent mode workflows.
- `@workstate` in VS Code Chat for explicit context queries.

Available tools:

- `workstate_get_context`
- `workstate_get_resume_state`
- `workstate_update_context`
- `workstate_save_decision`
- `workstate_reconcile`
- `workstate_get_handoff`

These tools return compact WorkState context and can save meaningful updates such as completed work, decisions, blockers, test results, and next actions. They do not expose raw `.workstate` JSON, credentials, `.env` contents, private keys, or provider chat histories.

Example chat prompts:

```text
@workstate where did we leave off?
@workstate what should I do next?
@workstate prepare context for Claude
@workstate reconcile my current project
@workstate save this decision: keep auth server-side
```

WorkState does not currently read arbitrary private Codex, Claude, Copilot, or Gemini conversations. Agent access depends on stable VS Code tool/chat support in the user’s environment.

## Automatic Context Capture

WorkState observes reliable local VS Code activity such as saved files, Git branch changes, and explicit captures. It does not read private AI chat histories through unsupported APIs.

High-confidence local signals are saved quietly. Uncertain extracted context is held for review.

## Project Bootstrap

WorkState can be installed halfway through an existing project. On first activation in a workspace, it creates local WorkState context without requiring a Task/Goal/Current State setup form.

It reconstructs an initial project view from safe evidence such as:

- current Git branch
- changed files
- recent commits
- available workspace metadata

Bootstrap inferences are source-aware and reviewable. WorkState does not claim to remember inaccessible historical AI conversations.

## Reconciliation

When VS Code restarts or WorkState resumes after being inactive, WorkState compares the previous snapshot with current workspace/Git evidence.

It can detect:

- new commits
- changed files
- branch changes
- stale context that needs review
- test claims that may conflict with later test-file changes

The resume context includes reconciliation evidence so the next AI session sees the actual project state, not just the last saved text.

## Automatic Context Extraction

WorkState includes deterministic local extraction for explicit engineering statements in captured notes/current-state updates.

It can identify statements such as:

- completed work
- decisions
- rejected approaches / Don't Repeat
- blockers
- test results
- next steps

This does not require OpenAI, Anthropic, Gemini, Copilot, or any WorkState API key.

## Continue Work

Continue Work is the primary action.

It reconstructs:

- current focus
- recent progress
- important decisions
- Don't Repeat items
- blockers
- test notes
- relevant files
- Git state where available
- previous/current target agent context

Then it prepares a context package for the selected AI agent.

## Capture

Capture is lightweight. Use it for:

- Decision
- Don't Forget
- Completed
- Note
- Blocker
- Test Result
- Next Action

If a note contains explicit statements like `Decision: keep the existing router` or `Next: test the flow`, WorkState extracts useful structured context locally.

## Handoff

Handoff creates a compact engineering context package that can be pasted into another AI session.

It can include project, current focus, completed work, decisions, Don't Repeat items, recent activity, relevant files, Git state, and next step.

## Task DNA

Task DNA is the chronological timeline of meaningful WorkState activity. It records captures, decisions, rejected approaches, blockers, tests, handoffs, review events, and session handoff events.

Current Task DNA is a chronological timeline, not a graph.

## Review Context

Review Context shows suggested context that should not be treated as confirmed yet.

For example, likely next actions are saved as suggestions. You can confirm or reject them. Rejected suggestions are not promoted into trusted WorkState context.

Conflicts also appear as reviewable context. WorkState does not silently choose between an AI claim and workspace evidence when they disagree.

## AI Provider Capabilities

Status values: `YES`, `NO`, `PARTIAL`, `PROPOSED`, `UNKNOWN`.

| Provider | Session observable? | Conversation accessible? | Agent response accessible? | User message accessible? | Session lifecycle accessible? | Session end detectable? | Context exhaustion detectable? | Can WorkState provide context? | Can WorkState inject context? | Can WorkState create a session? | Can WorkState continue a session? | Stable API? | Proposed API? | Provider-specific adapter required? | Fallback available? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Codex | NO | NO | NO | NO | NO | NO | NO | YES | NO | NO | NO | PARTIAL | PARTIAL | YES | YES |
| Claude / Claude Code | NO | NO | NO | NO | NO | NO | NO | YES | NO | NO | NO | PARTIAL | UNKNOWN | YES | YES |
| GitHub Copilot | PARTIAL | NO | NO | NO | PARTIAL | NO | NO | YES | NO | NO | NO | PARTIAL | PROPOSED | YES | YES |
| Gemini / Gemini Code Assist | NO | NO | NO | NO | NO | NO | NO | YES | NO | NO | NO | PARTIAL | UNKNOWN | YES | YES |
| Other AI agents | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | YES | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | YES | YES |

See `docs/provider-capability-matrix.md` for notes.

## Privacy

WorkState is local-first:

- no required WorkState account
- no required WorkState cloud
- no required backend
- no required AI API key
- no mandatory telemetry
- workspace context is stored locally
- `.workstate` data is excluded from VSIX packages
- Git information is read locally
- sensitive paths are excluded from relevant-file handling

Project context stays local unless you explicitly copy or share it.

## No WorkState Cloud

WorkState does not use a WorkState backend, hosted vector database, telemetry server, or account system.

## Cost

WorkState does not require a WorkState subscription or WorkState API. It does not make third-party AI subscriptions free; it simply does not require them for the core local context and handoff workflow.

## Settings

Available settings include:

- `workstate.exclusions`
- `workstate.notifications.enabled`
- `workstate.notifications.welcomeBack`
- `workstate.notifications.significantChanges`
- `workstate.notifications.branchChanges`
- `workstate.contextCapture.mode`

## How To Use WorkState

1. Install WorkState.
2. Open a project in VS Code.
3. Work normally with Codex, Claude, Copilot, Gemini, or another agent.
4. Capture important context when needed.
5. Let WorkState track saved-file/Git context locally.
6. Open **Continue Work** when switching chats or agents.
7. Select the target agent.
8. Paste the prepared context into the new AI session.
9. Use **Review Context** for suggested context.
10. Use **Task DNA** to inspect the timeline.

## Current Limitations

- agent-tool-assisted context is available only where VS Code exposes extension-contributed tools to the current agent workflow
- copy-assisted provider handoff remains the universal fallback
- no automatic provider conversation import
- no automatic injection into Codex, Claude, Copilot, Gemini, or other providers
- no direct context-window exhaustion detection
- provider usage-limit events are unavailable unless a provider exposes a stable API
- no MCP server in the current release
- no WorkState cloud sync
- no semantic/vector search
- no Task DNA graph
- no Agent Passport

WorkState does not automatically read every AI conversation. Deeper provider integrations will be added only where official supported APIs make them reliable and appropriate.

See [`docs/ai-integration-research.md`](docs/ai-integration-research.md) for the researched API boundary.

## Roadmap

- deeper provider integrations where official APIs allow them
- improved automatic extraction
- Review Context improvements
- semantic context search
- richer Task DNA
- additional agent adapters

## Installation

Install WorkState from the Visual Studio Code Marketplace, or install a generated VSIX during local testing.

## Creator

Created by Pranav.

GitHub: [pranavv1210](https://github.com/pranavv1210)

Repository: [github.com/pranavv1210/workstate](https://github.com/pranavv1210/workstate)

## Development

```bash
npm install
npm run compile
npm test
npm run lint
npm run package
```

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

Maintainers must configure this GitHub repository secret before automated publishing can work:

```text
VSCE_PAT
```

`VSCE_PAT` is used only by GitHub Actions to authenticate with the Visual Studio Marketplace publisher `pranavv1210`. Do not commit Marketplace tokens, `.env` files, or credentials to the repository.

## License

MIT
