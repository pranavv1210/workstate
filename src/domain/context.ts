import { GitContext, WorkState, WorkStateStore, createWorkState, getActive } from './model';
import { filterExcludedPaths } from './privacy';

export interface ContextSummary {
  projectName: string;
  focus: string;
  lastActivity: string;
  summary: string;
  next: string;
  recent: string[];
  decisions: string[];
  relevantFiles: string[];
  hasContext: boolean;
}

export function ensureWorkspaceContext(store: WorkStateStore, projectName: string): { store: WorkStateStore; state: WorkState; created: boolean } {
  const active = getActive(store);
  if (active) {
    return { store, state: active, created: false };
  }

  const existing = [...store.states]
    .filter((state) => state.status !== 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (existing) {
    const state = { ...existing, status: 'active' as const };
    return {
      store: {
        ...store,
        activeId: state.id,
        states: store.states.map((item) => (item.id === state.id ? state : item))
      },
      state,
      created: false
    };
  }

  const state = createWorkState({
    name: projectName,
    goal: 'Preserve project context across AI coding sessions.'
  });
  return {
    store: {
      ...store,
      activeId: state.id,
      states: [state, ...store.states]
    },
    state,
    created: true
  };
}

export function summarizeContext(state: WorkState | undefined, projectName: string, git?: GitContext, exclusions?: string[]): ContextSummary {
  if (!state) {
    return {
      projectName,
      focus: projectName,
      lastActivity: 'No activity captured yet',
      summary: 'Capture decisions, completed work, blockers, and notes as you work. WorkState will reconstruct where you left off.',
      next: 'Capture what matters from your current session.',
      recent: [],
      decisions: [],
      relevantFiles: git ? filterExcludedPaths(git.changedFiles, exclusions) : [],
      hasContext: false
    };
  }

  const recent = recentActivity(state);
  const focus = inferFocus(state, projectName);
  const decisions = state.decisions.slice(-3).map((item) => item.decision);
  const files = relevantFiles(state, git, exclusions);
  return {
    projectName,
    focus,
    lastActivity: relativeTime(state.updatedAt),
    summary: inferSummary(state, recent),
    next: state.nextAction || inferNext(state),
    recent,
    decisions,
    relevantFiles: files,
    hasContext: hasMeaningfulContext(state)
  };
}

export function generateContinuationContext(summary: ContextSummary, state: WorkState | undefined, git?: GitContext, exclusions?: string[]): string {
  const completed = state?.completed.slice(-5) ?? [];
  const blockers = state?.blockers.slice(-3) ?? [];
  const rejected = state?.rejectedApproaches.slice(-3) ?? [];
  const pendingReview = (state?.reviewItems ?? []).filter((item) => item.status === 'pending').slice(-3);
  const lastSession = state?.sessions?.at(-1);
  const latestReconciliation = state?.reconciliations?.at(-1);
  const conflicts = (state?.conflicts ?? []).filter((conflict) => conflict.status === 'needs_review').slice(-3);
  const lines = [
    'WORKSTATE CONTEXT',
    '',
    `Project: ${summary.projectName}`,
    '',
    'Current focus:',
    summary.focus,
    '',
    'Where you left off:',
    summary.summary,
    '',
    'Recently completed:',
    listOrNone(completed),
    '',
    'Important decisions:',
    listOrNone(summary.decisions),
    '',
    "Don't forget:",
    listOrNone([
      ...blockers.map((item) => `Blocker: ${item}`),
      ...rejected.map((item) => `Do not repeat ${item.approach}${item.reason ? ` - ${item.reason}` : ''}`)
    ]),
    '',
    'Recent activity:',
    listOrNone(summary.recent),
    '',
    'Relevant files:',
    listOrNone(summary.relevantFiles),
    '',
    'Git state:',
    git?.unavailableReason ? `Unavailable: ${git.unavailableReason}` : gitSummary(git, exclusions),
    '',
    'AI session context:',
    lastSession ? `Last target agent: ${lastSession.displayName}\nHandoff mode: copy-assisted unless provider status says otherwise.` : 'No target agent recorded yet.',
    '',
    'Suggested context needing review:',
    listOrNone(pendingReview.map((item) => `${item.type}: ${item.content}`)),
    '',
    'Reconciliation:',
    latestReconciliation ? `${latestReconciliation.summary}\n${latestReconciliation.evidence.map((item) => `- ${item}`).join('\n')}` : 'No reconciliation changes recorded.',
    '',
    'Conflicts / needs review:',
    listOrNone(conflicts.map((item) => `${item.summary} Claim: ${item.claim}`)),
    '',
    'Next:',
    summary.next,
    '',
    'Continue from this context. Preserve the decisions and avoid repeating rejected approaches unless there is new evidence.'
  ];
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function inferFocus(state: WorkState, projectName: string): string {
  if (state.currentState) {
    return shortLine(state.currentState);
  }
  if (state.completed.length > 0) {
    return shortLine(state.completed.at(-1) ?? projectName);
  }
  const last = state.dna.filter((event) => event.detail).at(-1);
  return shortLine(last?.detail ?? state.name ?? projectName);
}

function inferSummary(state: WorkState, recent: string[]): string {
  if (state.currentState) {
    return state.currentState;
  }
  if (recent.length > 0) {
    return recent.slice(0, 2).join(' ');
  }
  if (state.goal && state.goal !== 'Preserve project context across AI coding sessions.') {
    return state.goal;
  }
  return 'No detailed session context has been captured yet.';
}

function inferNext(state: WorkState): string {
  if (state.blockers.length > 0) {
    return `Resolve: ${state.blockers.at(-1)}`;
  }
  if (state.completed.length > 0) {
    return 'Continue from the latest completed work and verify the behavior.';
  }
  return 'Capture the next important change, decision, or blocker.';
}

function recentActivity(state: WorkState): string[] {
  return [...state.dna]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .filter((event) => event.type !== 'handoff')
    .slice(0, 5)
    .map((event) => event.detail || event.title);
}

function relevantFiles(state: WorkState, git?: GitContext, exclusions?: string[]): string[] {
  const merged = [...state.relevantFiles, ...(git?.changedFiles ?? [])];
  return [...new Set(filterExcludedPaths(merged, exclusions))].slice(0, 8);
}

function hasMeaningfulContext(state: WorkState): boolean {
  return Boolean(
    state.currentState ||
      state.completed.length ||
      state.blockers.length ||
      state.decisions.length ||
      state.rejectedApproaches.length ||
      state.testNotes ||
      state.nextAction ||
      state.dna.length > 1
  );
}

function relativeTime(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return 'Recently';
  }
  const diff = Date.now() - time;
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function shortLine(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean;
}

function listOrNone(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : 'None captured yet.';
}

function gitSummary(git?: GitContext, exclusions?: string[]): string {
  if (!git) {
    return 'Unavailable.';
  }
  const changedFiles = filterExcludedPaths(git.changedFiles, exclusions);
  const parts = [git.branch ? `Branch: ${git.branch}` : undefined, changedFiles.length ? `Changed files: ${changedFiles.join(', ')}` : 'Working tree clean or not captured.'].filter(Boolean);
  return parts.join('\n');
}
