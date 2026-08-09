import { AgentAdapter, AgentHandoffResult } from './agentAdapter';
import { AgentCapabilities, copyAssistedCapabilities } from './agentCapabilities';

class StaticAgentAdapter implements AgentAdapter {
  constructor(
    readonly providerId: string,
    readonly displayName: string,
    private readonly notes: string
  ) {}

  async detectAvailability(): Promise<boolean> {
    return true;
  }

  getCapabilities(): AgentCapabilities {
    return copyAssistedCapabilities(this.providerId, this.displayName, this.notes);
  }

  async provideContext(): Promise<AgentHandoffResult> {
    return {
      method: 'copy-assisted',
      message: `${this.displayName} does not expose stable automatic WorkState injection. Context was prepared for copy-assisted handoff.`
    };
  }
}

export class AgentRegistry {
  private readonly adapters: AgentAdapter[];

  constructor(adapters = defaultAgentAdapters()) {
    this.adapters = adapters;
  }

  all(): AgentAdapter[] {
    return [...this.adapters];
  }

  get(providerId: string): AgentAdapter | undefined {
    return this.adapters.find((adapter) => adapter.providerId === providerId);
  }

  capabilities(): AgentCapabilities[] {
    return this.adapters.map((adapter) => adapter.getCapabilities());
  }
}

export function defaultAgentAdapters(): AgentAdapter[] {
  return [
    new StaticAgentAdapter(
      'codex',
      'Codex',
      'No stable Marketplace-safe VS Code API was found for reading or injecting private Codex conversation history. WorkState uses provider-independent context plus copy-assisted handoff.'
    ),
    new StaticAgentAdapter(
      'claude',
      'Claude / Claude Code',
      'Current public capabilities do not provide stable third-party access to Claude session contents from this extension. WorkState keeps fallback handoff explicit.'
    ),
    new StaticAgentAdapter(
      'copilot',
      'GitHub Copilot',
      'VS Code exposes stable chat participant, language model, and tool APIs, but not stable APIs for arbitrary extensions to read or inject into private Copilot sessions.'
    ),
    new StaticAgentAdapter(
      'gemini',
      'Gemini / Gemini Code Assist',
      'No stable VS Code provider API was found for automatic Gemini chat import or injection. WorkState uses copy-assisted handoff.'
    ),
    new StaticAgentAdapter(
      'other',
      'Other AI Agents',
      'Provider-independent WorkState context can be pasted into any tool that accepts text context.'
    )
  ];
}
