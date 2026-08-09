import * as vscode from 'vscode';
import {
  WorkStateSaveDecisionInput,
  WorkStateToolScope,
  WorkStateUpdateContextInput
} from './workstateToolService';

export interface WorkStateAiBridge {
  getToolContext(scope?: WorkStateToolScope): Promise<string>;
  getToolResumeState(): Promise<string>;
  updateToolContext(input: WorkStateUpdateContextInput): Promise<string>;
  saveToolDecision(input: WorkStateSaveDecisionInput): Promise<string>;
  reconcileToolContext(): Promise<string>;
  getToolHandoff(targetAgent?: string): Promise<string>;
}

export function registerWorkStateLanguageModelTools(context: vscode.ExtensionContext, bridge: WorkStateAiBridge): void {
  const tools: Array<[string, vscode.LanguageModelTool<any>]> = [
    ['workstate_get_context', new TextTool((input: { scope?: WorkStateToolScope }) => bridge.getToolContext(input.scope), 'Reading WorkState context')],
    ['workstate_get_resume_state', new TextTool(() => bridge.getToolResumeState(), 'Preparing WorkState resume state')],
    [
      'workstate_update_context',
      new TextTool((input: WorkStateUpdateContextInput) => bridge.updateToolContext(input), 'Saving WorkState context', {
        title: 'Save context to WorkState?',
        message: 'This will update the local WorkState context for the current workspace.'
      })
    ],
    [
      'workstate_save_decision',
      new TextTool((input: WorkStateSaveDecisionInput) => bridge.saveToolDecision(input), 'Saving WorkState decision', {
        title: 'Save decision to WorkState?',
        message: 'This will add a confirmed decision to the local WorkState context.'
      })
    ],
    [
      'workstate_reconcile',
      new TextTool(() => bridge.reconcileToolContext(), 'Reconciling WorkState context', {
        title: 'Reconcile WorkState context?',
        message: 'This will compare stored context with local Git/workspace evidence and persist the result.'
      })
    ],
    [
      'workstate_get_handoff',
      new TextTool((input: { targetAgent?: string }) => bridge.getToolHandoff(input.targetAgent), 'Preparing WorkState handoff', {
        title: 'Create WorkState handoff?',
        message: 'This will generate and remember a compact local handoff for the selected target agent.'
      })
    ]
  ];

  for (const [name, tool] of tools) {
    context.subscriptions.push(vscode.lm.registerTool(name, tool));
  }
}

class TextTool<T extends object> implements vscode.LanguageModelTool<T> {
  constructor(
    private readonly run: (input: T) => Promise<string>,
    private readonly invocationMessage: string,
    private readonly confirmationMessages?: vscode.LanguageModelToolConfirmationMessages
  ) {}

  async invoke(options: vscode.LanguageModelToolInvocationOptions<T>): Promise<vscode.LanguageModelToolResult> {
    const text = await this.run(options.input);
    return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(text)]);
  }

  prepareInvocation(): vscode.PreparedToolInvocation {
    return {
      invocationMessage: this.invocationMessage,
      confirmationMessages: this.confirmationMessages
    };
  }
}
