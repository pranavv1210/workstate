import { GitContext, HandoffMode, WorkState } from './model';
import { filterExcludedPaths } from './privacy';

export function generateHandoff(state: WorkState, mode: HandoffMode, git?: GitContext, exclusions?: string[]): string {
  return mode === 'quick'
    ? generateQuickHandoff(state, exclusions)
    : generateFullHandoff(state, git, exclusions);
}

function generateQuickHandoff(state: WorkState, exclusions?: string[]): string {
  const files = filterExcludedPaths(state.relevantFiles, exclusions);
  const lines = [
    'WORKSTATE HANDOFF',
    '',
    'Task:',
    state.name,
    '',
    'Goal:',
    state.goal,
    '',
    'Current:',
    state.currentState || 'Not recorded.',
    '',
    'Completed:',
    listOrNone(state.completed),
    '',
    'Decisions:',
    decisionLines(state.decisions.slice(0, 3)),
    '',
    "Don't Repeat:",
    rejectedLines(state.rejectedApproaches.slice(0, 3), true),
    '',
    'Blocker:',
    state.blockers[0] || 'None recorded.',
    '',
    'Relevant Files:',
    listOrNone(files),
    '',
    'Test Status:',
    state.testNotes || 'Not recorded.',
    '',
    'Next:',
    state.nextAction || 'Not recorded.',
    '',
    'Continue from the current implementation.',
    'Preserve the decisions above.',
    "Do not repeat rejected approaches unless there is new evidence."
  ];
  return clean(lines);
}

function generateFullHandoff(state: WorkState, git?: GitContext, exclusions?: string[]): string {
  const files = filterExcludedPaths(state.relevantFiles, exclusions);
  const lines = [
    'WORKSTATE HANDOFF',
    '',
    'TASK',
    state.name,
    '',
    'GOAL',
    state.goal,
    '',
    'CURRENT STATE',
    state.currentState || 'Not recorded.',
    '',
    'COMPLETED',
    listOrNone(state.completed),
    '',
    'DECISIONS',
    decisionLines(state.decisions),
    '',
    "DON'T REPEAT",
    rejectedLines(state.rejectedApproaches, true),
    '',
    'BLOCKERS',
    listOrNone(state.blockers),
    '',
    'RELEVANT FILES',
    listOrNone(files),
    '',
    'TEST STATUS',
    state.testNotes || 'Not recorded.',
    '',
    'GIT CONTEXT',
    gitLines(git),
    '',
    'NEXT ACTION',
    state.nextAction || 'Not recorded.',
    '',
    'CONTINUATION RULE',
    'Continue from the current implementation. Preserve recorded decisions. Do not repeat rejected approaches unless there is new evidence or the developer explicitly changes direction.'
  ];
  return clean(lines);
}

function listOrNone(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : 'None recorded.';
}

function decisionLines(items: WorkState['decisions']): string {
  if (items.length === 0) {
    return 'None recorded.';
  }
  return items
    .map((item) => `- ${item.decision}${item.reason ? `\n  Reason: ${item.reason}` : ''}`)
    .join('\n');
}

function rejectedLines(items: WorkState['rejectedApproaches'], explicit = false): string {
  if (items.length === 0) {
    return 'None recorded.';
  }
  return items
    .map((item) => `- ${item.approach}${item.reason ? `\n  Reason: ${item.reason}` : ''}${explicit ? '\n  Rule: Do not return to this without new evidence.' : ''}`)
    .join('\n');
}

function gitLines(git?: GitContext): string {
  if (!git || git.unavailableReason) {
    return git?.unavailableReason ? `Unavailable: ${git.unavailableReason}` : 'Unavailable.';
  }
  const lines = [
    git.branch ? `Branch: ${git.branch}` : undefined,
    git.changedFiles.length > 0 ? `Changed files:\n${listOrNone(git.changedFiles)}` : 'Changed files: None recorded.',
    git.recentCommits.length > 0 ? `Recent commits:\n${listOrNone(git.recentCommits)}` : 'Recent commits: None recorded.'
  ].filter(Boolean);
  return lines.join('\n');
}

function clean(lines: string[]): string {
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
