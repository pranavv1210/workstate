# WorkState Provider Capability Matrix

Research basis: official Visual Studio Code AI Extensibility, Chat Participant, Language Model, Language Model Tools, Language Model Chat Provider, and MCP documentation reviewed for the current implementation. The stable APIs support building chat participants, language-model-backed features, language model tools, MCP integrations, and bringing model providers into VS Code. They do not provide a stable Marketplace-safe API for a third-party extension to read arbitrary private provider conversations, detect context-window exhaustion across providers, or inject text into another provider's private chat session.

Status values: `YES`, `NO`, `PARTIAL`, `PROPOSED`, `UNKNOWN`.

| Provider | Session observable? | Conversation accessible? | Agent response accessible? | User message accessible? | Session lifecycle accessible? | Session end detectable? | Context exhaustion detectable? | Can WorkState provide context? | Can WorkState inject context? | Can WorkState create a session? | Can WorkState continue a session? | Stable API? | Proposed API? | Provider-specific adapter required? | Fallback available? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Codex | NO | NO | NO | NO | NO | NO | NO | YES | NO | NO | NO | PARTIAL | PARTIAL | YES | YES |
| Claude / Claude Code | NO | NO | NO | NO | NO | NO | NO | YES | NO | NO | NO | PARTIAL | UNKNOWN | YES | YES |
| GitHub Copilot | PARTIAL | NO | NO | NO | PARTIAL | NO | NO | YES | NO | NO | NO | PARTIAL | PROPOSED | YES | YES |
| Gemini / Gemini Code Assist | NO | NO | NO | NO | NO | NO | NO | YES | NO | NO | NO | PARTIAL | UNKNOWN | YES | YES |
| Other AI agents | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | YES | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | YES | YES |

## Notes

- `Can WorkState provide context?` is `YES` because WorkState can generate local context packages and copy-assisted handoffs for any agent that accepts pasted text.
- `Can WorkState inject context?` is `NO` where no stable provider API is available for direct injection into another extension's private chat session.
- GitHub Copilot is marked `PARTIAL` for stable API because VS Code supports chat participants, language model APIs, language model tools, and MCP tools, but those APIs do not grant general read/write access to private Copilot chat sessions.
- Proposed APIs are not used for Marketplace release behavior because WorkState must stay stable, installable, and honest.
- The current fallback is provider-independent copy-assisted handoff.
