# WorkState Masterplan

WorkState is a developer-controlled work-context layer for AI-assisted development.

The V1 product proves one workflow:

```text
AI session ends or becomes too large
  -> WorkState preserves important engineering state
  -> developer creates a structured handoff
  -> developer copies it
  -> developer starts a new AI chat
  -> developer pastes it
  -> work continues without reconstructing context
```

## V1 Scope

- VS Code Desktop extension
- one active WorkState
- manual creation and editing
- structured fields for goal, current state, completed work, blockers, decisions, rejected approaches, relevant files, test notes, and next action
- quick and full handoff generation
- handoff preview, editing, and copy-to-clipboard
- context restoration UI
- simple chronological Task DNA
- local JSON persistence
- basic Git context
- privacy exclusions
- command palette commands
- tests, documentation, and VSIX packaging

## Non-Goals

V1 does not include automatic task detection, AI memory extraction, cloud sync, accounts, telemetry, native AI-provider injection, semantic search, multiple active tasks, or visual graphs.

## Product Principle

AI can suggest what to remember. The developer decides what becomes trusted work state.

