import { mergeContextMemories } from '../context/contextMerger';
import { createWorkspaceSnapshot, reconcileWorkspaceState } from '../context/reconciliation';
import { ContextSummary, generateContinuationContext, summarizeContext } from '../domain/context';
import { WorkState, ContextMemoryType, GitContext, QuickUpdateInput, makeId, nowIso } from '../domain/model';
import { recordHandoff } from '../domain/mutations';
import { AgentRegistry } from '../agents/agentRegistry';

export type WorkStateToolScope = 'current' | 'recent' | 'project' | 'resume';
export type WorkStateToolUpdateType =
  | 'completed'
  | 'current_state'
  | 'decision'
  | 'rejected'
  | 'blocker'
  | 'test'
  | 'next_action'
  | 'note';

export interface WorkStateToolContext {
  state: WorkState;
  projectName: string;
  git?: GitContext;
  exclusions?: string[];
}

export interface WorkStateUpdateContextInput {
  type: WorkStateToolUpdateType;
  content: string;
  reason?: string;
  evidence?: string;
}

export interface WorkStateSaveDecisionInput {
  decision: string;
  reason?: string;
  evidence?: string;
}

export interface WorkStateToolResult {
  state: WorkState;
  message: string;
}

export class WorkStateToolService {
  private readonly agents = new AgentRegistry();

  getContext(context: WorkStateToolContext, scope: WorkStateToolScope = 'current'): string {
    const summary = this.summary(context);
    if (scope === 'resume') {
      return this.getResumeState(context);
    }
    return formatContextSummary(context.state, summary, context.git);
  }

  getResumeState(context: WorkStateToolContext): string {
    return generateContinuationContext(this.summary(context), context.state, context.git, context.exclusions);
  }

  updateContext(context: WorkStateToolContext, input: WorkStateUpdateContextInput): WorkStateToolResult {
    const content = input.content?.trim();
    if (!content) {
      throw new Error('WorkState tool update needs content.');
    }
    const mapped = mapUpdateInput(input);
    if (mapped.type === 'rejected' && !input.reason?.trim()) {
      throw new Error("Don't Repeat needs a reason.");
    }
    const next = mergeContextMemories(context.state, [
      {
        id: makeId('memory'),
        type: toMemoryType(mapped.type),
        content,
        reason: input.reason?.trim(),
        confidence: 'confirmed',
        source: 'agent-adapter',
        timestamp: nowIso(),
        evidence: input.evidence?.trim()
      }
    ]);
    return {
      state: next,
      message: `Saved ${label(mapped.type)} to WorkState.`
    };
  }

  saveDecision(context: WorkStateToolContext, input: WorkStateSaveDecisionInput): WorkStateToolResult {
    return this.updateContext(context, {
      type: 'decision',
      content: input.decision,
      reason: input.reason,
      evidence: input.evidence
    });
  }

  reconcile(context: WorkStateToolContext): WorkStateToolResult {
    const snapshot = createWorkspaceSnapshot(context.projectName, context.git);
    const next = reconcileWorkspaceState(context.state, snapshot);
    const latest = next.reconciliations?.at(-1);
    return {
      state: next,
      message: latest
        ? `${latest.summary}\n${latest.evidence.map((item) => `- ${item}`).join('\n')}`.trim()
        : 'WorkState reconciled the current workspace. No meaningful changes were detected.'
    };
  }

  getHandoff(context: WorkStateToolContext, targetAgent = 'Other'): WorkStateToolResult {
    const provider = findProvider(this.agents, targetAgent);
    const summary = this.summary(context);
    const content = [
      generateContinuationContext(summary, context.state, context.git, context.exclusions).trim(),
      '',
      `Target agent: ${provider.displayName}`,
      `Delivery: ${provider.fallbackLabel}`,
      provider.notes
    ].join('\n');
    return {
      state: recordHandoff(context.state, 'quick', `${content.trim()}\n`),
      message: `${content.trim()}\n`
    };
  }

  private summary(context: WorkStateToolContext): ContextSummary {
    return summarizeContext(context.state, context.projectName, context.git, context.exclusions);
  }
}

function findProvider(agents: AgentRegistry, targetAgent: string) {
  const normalized = targetAgent.toLowerCase();
  const provider =
    agents
      .capabilities()
      .find((provider) => provider.providerId.toLowerCase() === normalized || provider.displayName.toLowerCase().includes(normalized)) ??
    agents.capabilities().find((provider) => provider.providerId === 'other') ??
    agents.capabilities()[0];
  if (!provider) {
    throw new Error('No WorkState provider adapters are available.');
  }
  return provider;
}

function formatContextSummary(state: WorkState, summary: ContextSummary, git?: GitContext): string {
  const recent = summary.recent.slice(0, 5);
  const decisions = summary.decisions.slice(0, 5);
  const files = summary.relevantFiles.slice(0, 8);
  const conflicts = (state.conflicts ?? []).filter((item) => item.status === 'needs_review').slice(-3);
  return [
    'WORKSTATE CONTEXT',
    '',
    `Project: ${summary.projectName}`,
    `Current focus: ${summary.focus}`,
    `Last activity: ${summary.lastActivity}`,
    '',
    'Where you left off:',
    summary.summary,
    '',
    'Next:',
    summary.next,
    '',
    'Recent activity:',
    listOrNone(recent),
    '',
    'Decisions:',
    listOrNone(decisions),
    '',
    'Relevant files:',
    listOrNone(files),
    '',
    'Git:',
    git?.unavailableReason ? `Unavailable: ${git.unavailableReason}` : gitSummary(git, summary.relevantFiles),
    '',
    'Needs review:',
    listOrNone(conflicts.map((item) => item.summary))
  ]
    .join('\n')
    .trim() + '\n';
}

function mapUpdateInput(input: WorkStateUpdateContextInput): QuickUpdateInput {
  const typeMap: Record<WorkStateToolUpdateType, QuickUpdateInput['type']> = {
    completed: 'completed',
    current_state: 'currentState',
    decision: 'decision',
    rejected: 'rejected',
    blocker: 'blocker',
    test: 'testResult',
    next_action: 'nextAction',
    note: 'note'
  };
  return {
    type: typeMap[input.type],
    content: input.content,
    reason: input.reason,
    blockerMode: 'add'
  };
}

function toMemoryType(type: QuickUpdateInput['type']): ContextMemoryType {
  return type;
}

function label(type: QuickUpdateInput['type']): string {
  switch (type) {
    case 'currentState':
      return 'current state';
    case 'nextAction':
      return 'next action';
    case 'testResult':
      return 'test result';
    default:
      return type;
  }
}

function listOrNone(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : 'None captured yet.';
}

function gitSummary(git?: GitContext, allowedFiles?: string[]): string {
  if (!git) {
    return 'Unavailable.';
  }
  const changedFiles = allowedFiles?.length
    ? git.changedFiles.filter((file) => allowedFiles.includes(file))
    : git.changedFiles;
  return [
    git.branch ? `Branch: ${git.branch}` : undefined,
    changedFiles.length ? `Changed files: ${changedFiles.join(', ')}` : 'Working tree clean or not captured.',
    git.recentCommits.length ? `Recent commits: ${git.recentCommits.slice(0, 3).join(' | ')}` : undefined
  ]
    .filter(Boolean)
    .join('\n');
}
