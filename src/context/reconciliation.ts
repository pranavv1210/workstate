import {
  ContextConflict,
  GitContext,
  ReconciliationRecord,
  ReviewItem,
  WorkState,
  WorkspaceSnapshot,
  makeId,
  nowIso
} from '../domain/model';

export function createWorkspaceSnapshot(projectName: string, git?: GitContext): WorkspaceSnapshot {
  const timestamp = nowIso();
  const evidenceSummary = [
    git?.branch ? `Branch: ${git.branch}` : undefined,
    git?.changedFiles.length ? `Changed files: ${git.changedFiles.join(', ')}` : undefined,
    git?.recentCommits.length ? `Recent commits: ${git.recentCommits.slice(0, 3).join(' | ')}` : undefined,
    git?.unavailableReason ? `Git unavailable: ${git.unavailableReason}` : undefined
  ].filter(Boolean) as string[];

  return {
    timestamp,
    projectName,
    branch: git?.branch,
    changedFiles: git?.changedFiles ?? [],
    recentCommits: git?.recentCommits ?? [],
    evidenceSummary
  };
}

export function reconcileWorkspaceState(state: WorkState, snapshot: WorkspaceSnapshot): WorkState {
  const previous = state.lastSnapshot;
  const records: ReconciliationRecord[] = [];
  const reviewItems: ReviewItem[] = [...(state.reviewItems ?? [])];
  const conflicts: ContextConflict[] = [...(state.conflicts ?? [])];
  const timestamp = nowIso();

  if (!previous) {
    const bootstrap = bootstrapRecord(snapshot);
    records.push(bootstrap);
    const inferredFocus = inferFocusFromSnapshot(snapshot);
    if (inferredFocus && !hasPendingReview(reviewItems, inferredFocus)) {
      reviewItems.push({
        id: makeId('review'),
        type: 'currentState',
        content: inferredFocus,
        confidence: 'needs_review',
        source: 'git',
        timestamp,
        evidence: snapshot.evidenceSummary.join('\n'),
        status: 'pending'
      });
    }
  } else {
    const newCommits = snapshot.recentCommits.filter((commit) => !previous.recentCommits.includes(commit));
    const changedFiles = snapshot.changedFiles.filter((file) => !previous.changedFiles.includes(file));
    const branchChanged = previous.branch && snapshot.branch && previous.branch !== snapshot.branch;
    if (newCommits.length || changedFiles.length || branchChanged) {
      records.push({
        id: makeId('reconcile'),
        timestamp,
        type: 'inactive_changes',
        summary: summarizeInactiveChanges(newCommits, changedFiles, branchChanged ? `${previous.branch} -> ${snapshot.branch}` : undefined),
        evidence: [
          ...newCommits.map((commit) => `Commit: ${commit}`),
          ...changedFiles.map((file) => `Changed file: ${file}`),
          branchChanged ? `Branch changed: ${previous.branch} -> ${snapshot.branch}` : undefined
        ].filter(Boolean) as string[],
        confidence: newCommits.length ? 'confirmed' : 'suggested'
      });
    }
  }

  const conflict = detectTestConflict(state, snapshot);
  if (conflict && !conflicts.some((item) => item.summary === conflict.summary && item.status === 'needs_review')) {
    conflicts.push(conflict);
    reviewItems.push({
      id: makeId('review'),
      type: 'testResult',
      content: conflict.summary,
      confidence: 'needs_review',
      source: 'workspace',
      timestamp,
      evidence: conflict.evidence.join('\n'),
      status: 'pending'
    });
  }

  const compacted = compactReconciliations([...(state.reconciliations ?? []), ...records]);
  return {
    ...state,
    lastSnapshot: snapshot,
    reconciliations: compacted,
    reviewItems,
    conflicts: compactConflicts(conflicts),
    dna: records.length
      ? [
          ...state.dna,
          ...records.map((record) => ({
            id: makeId('dna'),
            type: 'context' as const,
            title: record.type === 'bootstrap' ? 'Project bootstrap reconstructed.' : 'Workspace changes reconciled.',
            detail: `${record.summary}\n${record.evidence.join('\n')}`.trim(),
            timestamp: record.timestamp,
            confidence: record.confidence,
            source: 'git' as const
          }))
        ].slice(-200)
      : state.dna.slice(-200),
    updatedAt: records.length || conflict ? timestamp : state.updatedAt
  };
}

function bootstrapRecord(snapshot: WorkspaceSnapshot): ReconciliationRecord {
  return {
    id: makeId('reconcile'),
    timestamp: snapshot.timestamp,
    type: 'bootstrap',
    summary: 'Initial project context reconstructed from available workspace evidence.',
    evidence: snapshot.evidenceSummary,
    confidence: snapshot.recentCommits.length || snapshot.changedFiles.length ? 'suggested' : 'needs_review'
  };
}

function inferFocusFromSnapshot(snapshot: WorkspaceSnapshot): string | undefined {
  const commit = snapshot.recentCommits.find((item) => /\b(fix|add|implement|update|refactor|test)\b/i.test(item));
  if (commit) {
    return `Current focus appears related to: ${commit.replace(/^[a-f0-9]+\s+/i, '')}`;
  }
  const file = snapshot.changedFiles[0];
  if (file) {
    return `Current focus appears related to changed file: ${file}`;
  }
  return undefined;
}

function summarizeInactiveChanges(newCommits: string[], changedFiles: string[], branchChange?: string): string {
  const parts = [
    newCommits.length ? `${newCommits.length} new commit${newCommits.length === 1 ? '' : 's'}` : undefined,
    changedFiles.length ? `${changedFiles.length} changed file${changedFiles.length === 1 ? '' : 's'}` : undefined,
    branchChange ? `branch changed (${branchChange})` : undefined
  ].filter(Boolean);
  return `Work changed while WorkState was inactive: ${parts.join(', ')}.`;
}

function detectTestConflict(state: WorkState, snapshot: WorkspaceSnapshot): ContextConflict | undefined {
  const latestTestClaim = [...(state.memories ?? [])]
    .reverse()
    .find((memory) => memory.type === 'testResult' && /\b(pass|passed|passing)\b/i.test(memory.content));
  if (!latestTestClaim) {
    return undefined;
  }
  const changedTests = snapshot.changedFiles.filter((file) => /\b(test|spec)\b/i.test(file));
  if (changedTests.length === 0) {
    return undefined;
  }
  return {
    id: makeId('conflict'),
    timestamp: nowIso(),
    summary: 'A previous passing-test claim may be stale because test files changed afterward.',
    claim: latestTestClaim.content,
    evidence: changedTests.map((file) => `Changed test file: ${file}`),
    status: 'needs_review'
  };
}

function hasPendingReview(items: ReviewItem[], content: string): boolean {
  return items.some((item) => item.status === 'pending' && item.content.toLowerCase() === content.toLowerCase());
}

function compactReconciliations(records: ReconciliationRecord[]): ReconciliationRecord[] {
  return records.slice(-25);
}

function compactConflicts(conflicts: ContextConflict[]): ContextConflict[] {
  return conflicts.slice(-25);
}
