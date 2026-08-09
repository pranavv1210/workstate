# WorkState AI Integration Research

Research date: 2026-08-09

Sources reviewed:

- Visual Studio Code Language Model Tool API: https://code.visualstudio.com/api/extension-guides/ai/tools
- Visual Studio Code Chat Participant API: https://code.visualstudio.com/api/extension-guides/ai/chat
- Visual Studio Code Chat Tutorial: https://code.visualstudio.com/api/extension-guides/ai/chat-tutorial
- Visual Studio Code API Reference: https://code.visualstudio.com/api/references/vscode-api
- Visual Studio Code Activation Events: https://code.visualstudio.com/api/references/activation-events
- Visual Studio Code Proposed API guidance: https://code.visualstudio.com/api/advanced-topics/using-proposed-api

## Summary

WorkState can safely expose project-owned engineering context to AI coding workflows through stable VS Code extension APIs:

- extension-contributed Language Model Tools
- `@workstate` Chat Participant

These APIs let agents and users retrieve or update WorkState context without scraping private provider UIs, storing provider credentials, or requiring a WorkState cloud service.

Stable VS Code APIs do not currently provide a Marketplace-safe way for WorkState to read arbitrary Codex, Claude, Copilot, Gemini, or other provider conversations, detect all usage-limit/context-window interruptions, or automatically inject text into another extension's private chat session. WorkState therefore uses agent-accessible tools where available and keeps copy-assisted handoff as the provider-independent fallback.

## API Classification

| API | Classification | What It Allows | WorkState Use | Limitations | Marketplace Implications |
| --- | --- | --- | --- | --- | --- |
| Language Model Tools (`contributes.languageModelTools`, `vscode.lm.registerTool`) | STABLE | Extension contributes named tools that can be invoked by VS Code agent mode or referenced in prompts. Tool input is JSON-schema validated. Tool output returns text/data parts. | Implement `workstate_get_context`, `workstate_get_resume_state`, `workstate_update_context`, `workstate_save_decision`, `workstate_reconcile`, and `workstate_get_handoff`. | Tools do not grant automatic access to private provider chat history. Agent/tool invocation depends on VS Code agent support and user/tool permissions. | Safe for Marketplace. Uses stable activation event `onLanguageModelTool:<tool>`. |
| Chat Participant (`contributes.chatParticipants`, `vscode.chat.createChatParticipant`) | STABLE | Extension contributes an `@` participant that handles user prompts and slash commands in VS Code Chat. | Implement `@workstate` for explicit context queries, resume-state generation, handoff preparation, reconciliation, and saving decisions. | The participant owns its own request. It does not automatically observe or modify other providers' private sessions. | Safe for Marketplace. Uses stable activation event `onChatParticipant:<id>`. |
| Language Model API (`vscode.lm.selectChatModels`, chat model requests) | STABLE | Extensions can request access to language models selected/available in VS Code with user consent. | Not required for the current WorkState bridge because WorkState can answer from local state and Git evidence. | Would involve model access consent and possible provider account requirements. Not needed for local-first behavior. | Can be used in future optional AI-assisted features, but core WorkState must not require it. |
| MCP server definition providers | STABLE | Extensions can publish MCP server definitions for editor consumption. | Not implemented now. WorkState needs direct VS Code APIs, workspace storage, Git state, and Marketplace packaging; extension-contributed LM tools are the simpler fit. | MCP is useful for cross-editor/tool portability but adds setup/operational complexity for this release. | Future option if WorkState needs external agent compatibility beyond VS Code. |
| Language Model Chat Providers | STABLE | Extensions can contribute a model provider to VS Code. | Not applicable. WorkState is not an AI model/provider. | Would require model/provider infrastructure and credentials. | Should not be used for WorkState's context bridge. |
| Chat/session lifecycle internals | PROPOSED / UNAVAILABLE for this use | Some VS Code chat/session surfaces exist as proposed APIs or provider-specific internals. | Not used. | Proposed APIs are unstable, Insiders-only, and not appropriate for Marketplace release. Stable APIs do not expose provider-agnostic session IDs, session ends, context exhaustion, or usage-limit resets. | Do not use in public Marketplace build. |
| Provider private UIs/databases/network traffic | UNAVAILABLE / UNSUPPORTED | Could theoretically reveal provider session details through scraping or internals. | Forbidden. | Unreliable, unsafe, and violates the no-fake-integration rule. | Not Marketplace-safe. |

## Implemented Tool Surface

| Tool | Purpose | Side Effect |
| --- | --- | --- |
| `workstate_get_context` | Return compact current/recent/project/resume WorkState context. | No |
| `workstate_get_resume_state` | Return the continuation context a new AI coding session needs. | Reconciles before returning when called through the extension bridge. |
| `workstate_update_context` | Save completed/current-state/decision/rejected/blocker/test/next-action/note updates from an agent. | Yes |
| `workstate_save_decision` | Save a confirmed engineering decision. | Yes |
| `workstate_reconcile` | Compare local WorkState with current Git/workspace evidence and persist reconciliation. | Yes |
| `workstate_get_handoff` | Generate and remember a compact handoff for a target agent. | Yes |

Side-effect tools customize VS Code confirmation messages. All tool outputs are compact summaries, not raw `.workstate` JSON.

## Implemented Chat Participant

`@workstate` supports:

- `@workstate where did we leave off?`
- `@workstate what should I do next?`
- `@workstate prepare context for Claude`
- `@workstate reconcile my current project`
- `@workstate save this decision: use Supabase for authentication`

The participant uses the same WorkState bridge and service as the Language Model Tools.

## MCP Decision

MCP is not implemented in this release.

Reasoning:

- WorkState already runs inside VS Code and needs VS Code workspace APIs, workspace storage, and Git/workspace context.
- Extension-contributed Language Model Tools are the official Marketplace-native path for VS Code agent mode.
- Adding an MCP server now would increase setup and test surface without improving the core VS Code experience.

MCP remains a future option for non-VS Code agent compatibility if it can stay local-first and zero-infrastructure.

## Session API Findings

Stable VS Code APIs currently do not provide a provider-independent way for WorkState to know:

- the active third-party AI provider
- private provider session IDs
- session starts/ends for arbitrary providers
- context-window exhaustion
- usage-limit interruption/reset
- private conversation contents
- automatic injection into another provider's private chat

WorkState therefore records explicit provider handoff/session events from its own UI and reconstructs context from:

- persisted WorkState state
- explicit captures/tool updates
- Git branch
- changed files
- recent commits
- reconciliation records
- conflicts/review items

## Provider Capability Summary

WorkState context belongs to the project, not a provider. Current provider support is:

- VS Code agent mode: WorkState LM tools are available where the agent can use extension-contributed tools.
- VS Code Chat: `@workstate` is explicitly invokable by the user.
- Codex/Claude/Copilot/Gemini/other external chats: copy-assisted handoff remains the reliable fallback unless their VS Code integration supports WorkState tools.

No provider-specific private APIs are used.
