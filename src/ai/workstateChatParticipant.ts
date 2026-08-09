import * as vscode from 'vscode';
import { WorkStateAiBridge } from './languageModelTools';

export function registerWorkStateChatParticipant(context: vscode.ExtensionContext, bridge: WorkStateAiBridge): void {
  const participant = vscode.chat.createChatParticipant('workstate.chat', async (request, _chatContext, stream) => {
    const prompt = request.prompt.trim();
    const lower = prompt.toLowerCase();
    try {
      if (request.command === 'reconcile' || lower.includes('reconcile')) {
        stream.markdown(await bridge.reconcileToolContext());
        return;
      }

      const decision = extractDecision(prompt);
      if (request.command === 'decision' || decision) {
        stream.markdown(await bridge.saveToolDecision({ decision: decision ?? prompt.replace(/^save\s+(this\s+)?decision:?\s*/i, '') }));
        return;
      }

      const target = extractTargetAgent(prompt);
      if (request.command === 'handoff' || lower.includes('handoff') || lower.includes('prepare context')) {
        stream.markdown(await bridge.getToolHandoff(target));
        return;
      }

      if (request.command === 'resume' || lower.includes('where did we leave off') || lower.includes('what should i do next') || lower.includes('continue')) {
        stream.markdown(await bridge.getToolResumeState());
        return;
      }

      stream.markdown(await bridge.getToolContext('current'));
    } catch (error) {
      stream.markdown(`WorkState could not answer that request.\n\n${error instanceof Error ? error.message : String(error)}`);
    }
  });

  participant.iconPath = new vscode.ThemeIcon('debug-continue');
  participant.followupProvider = {
    provideFollowups() {
      return [
        { prompt: 'where did we leave off?', label: 'Where did we leave off?' },
        { prompt: 'what should I do next?', label: 'What should I do next?' },
        { prompt: 'prepare context for Claude', label: 'Prepare context for Claude' },
        { prompt: 'reconcile my current project', label: 'Reconcile my project' }
      ];
    }
  };

  context.subscriptions.push(participant);
}

function extractDecision(prompt: string): string | undefined {
  const match = prompt.match(/save\s+(?:this\s+)?decision:?\s+(.+)/i);
  return match?.[1]?.trim();
}

function extractTargetAgent(prompt: string): string | undefined {
  const match = prompt.match(/\b(codex|claude|copilot|gemini|other)\b/i);
  return match?.[1];
}
