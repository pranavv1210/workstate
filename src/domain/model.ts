export type WorkStateStatus = 'active' | 'paused' | 'completed' | 'archived';
export type ContextConfidence = 'confirmed' | 'suggested' | 'needs_review' | 'rejected';
export type ContextSource = 'manual' | 'git' | 'workspace' | 'agent-adapter' | 'deterministic-extraction';
export type ContextMemoryType =
  | 'completed'
  | 'currentState'
  | 'blocker'
  | 'decision'
  | 'rejected'
  | 'testResult'
  | 'nextAction'
  | 'note'
  | 'fileActivity'
  | 'session';

export interface Decision {
  id: string;
  decision: string;
  reason?: string;
  timestamp: string;
}

export interface RejectedApproach {
  id: string;
  approach: string;
  reason: string;
  timestamp: string;
}

export interface TaskDnaEvent {
  id: string;
  type:
    | 'created'
    | 'updated'
    | 'decision'
    | 'rejected'
    | 'completed'
    | 'blocker'
    | 'nextAction'
    | 'test'
    | 'note'
    | 'handoff'
    | 'session'
    | 'context'
    | 'review'
    | 'archived';
  title: string;
  detail?: string;
  timestamp: string;
  confidence?: ContextConfidence;
  source?: ContextSource;
}

export interface GitContext {
  branch?: string;
  changedFiles: string[];
  recentCommits: string[];
  unavailableReason?: string;
}

export interface WorkspaceSnapshot {
  timestamp: string;
  projectName: string;
  branch?: string;
  changedFiles: string[];
  recentCommits: string[];
  evidenceSummary: string[];
}

export interface ReconciliationRecord {
  id: string;
  timestamp: string;
  type: 'bootstrap' | 'resume' | 'inactive_changes';
  summary: string;
  evidence: string[];
  confidence: ContextConfidence;
}

export interface ContextConflict {
  id: string;
  timestamp: string;
  summary: string;
  claim: string;
  evidence: string[];
  status: 'needs_review' | 'accepted_claim' | 'used_workspace' | 'dismissed';
}

export interface WorkState {
  id: string;
  name: string;
  goal: string;
  currentState: string;
  completed: string[];
  blockers: string[];
  decisions: Decision[];
  rejectedApproaches: RejectedApproach[];
  relevantFiles: string[];
  testNotes: string;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
  status: WorkStateStatus;
  dna: TaskDnaEvent[];
  memories?: ContextMemory[];
  reviewItems?: ReviewItem[];
  sessions?: AgentSession[];
  contextLayers?: ContextLayers;
  lastSnapshot?: WorkspaceSnapshot;
  reconciliations?: ReconciliationRecord[];
  conflicts?: ContextConflict[];
  latestHandoff?: {
    mode: HandoffMode;
    content: string;
    createdAt: string;
  };
}

export interface ContextMemory {
  id: string;
  type: ContextMemoryType;
  content: string;
  reason?: string;
  confidence: ContextConfidence;
  source: ContextSource;
  timestamp: string;
  agentId?: string;
  evidence?: string;
}

export interface ReviewItem {
  id: string;
  type: ContextMemoryType;
  content: string;
  reason?: string;
  confidence: Extract<ContextConfidence, 'suggested' | 'needs_review'>;
  source: ContextSource;
  timestamp: string;
  evidence?: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

export interface AgentSession {
  id: string;
  providerId: string;
  displayName: string;
  startedAt: string;
  lastSeenAt: string;
  status: 'active' | 'ended' | 'unknown';
}

export interface ContextLayers {
  project: {
    decisions: string[];
    rejectedApproaches: string[];
    constraints: string[];
    patterns: string[];
  };
  session: {
    focus?: string;
    objective?: string;
    currentState?: string;
    currentAgent?: string;
    previousAgent?: string;
    nextAction?: string;
    recentFiles: string[];
  };
}

export type HandoffMode = 'quick' | 'full';

export interface WorkStateStore {
  version: 1;
  activeId?: string;
  states: WorkState[];
}

export interface WorkStateInput {
  name: string;
  goal: string;
  currentState?: string;
  blocker?: string;
  nextAction?: string;
}

export type QuickUpdateType =
  | 'completed'
  | 'currentState'
  | 'blocker'
  | 'decision'
  | 'rejected'
  | 'testResult'
  | 'nextAction'
  | 'note';

export interface QuickUpdateInput {
  type: QuickUpdateType;
  content: string;
  reason?: string;
  blockerMode?: 'add' | 'replace';
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeId(prefix = 'ws'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createWorkState(input: WorkStateInput): WorkState {
  const timestamp = nowIso();
  const blockers = input.blocker?.trim() ? [input.blocker.trim()] : [];
  const state: WorkState = {
    id: makeId(),
    name: input.name.trim(),
    goal: input.goal.trim(),
    currentState: input.currentState?.trim() ?? '',
    completed: [],
    blockers,
    decisions: [],
    rejectedApproaches: [],
    relevantFiles: [],
    testNotes: '',
    nextAction: input.nextAction?.trim() ?? '',
    createdAt: timestamp,
    updatedAt: timestamp,
    status: 'active',
    dna: [
      {
        id: makeId('dna'),
        type: 'created',
        title: 'Task created.',
        detail: input.goal.trim(),
        timestamp
      }
    ],
    memories: [],
    reviewItems: [],
    sessions: [],
    contextLayers: emptyContextLayers(),
    reconciliations: [],
    conflicts: []
  };

  if (state.currentState) {
    state.dna.push({
      id: makeId('dna'),
      type: 'updated',
      title: 'Current state recorded.',
      detail: state.currentState,
      timestamp
    });
  }

  if (blockers.length > 0) {
    state.dna.push({
      id: makeId('dna'),
      type: 'blocker',
      title: 'Blocker recorded.',
      detail: blockers[0],
      timestamp
    });
  }

  return state;
}

export function emptyStore(): WorkStateStore {
  return { version: 1, states: [] };
}

export function emptyContextLayers(): ContextLayers {
  return {
    project: {
      decisions: [],
      rejectedApproaches: [],
      constraints: [],
      patterns: []
    },
    session: {
      recentFiles: []
    }
  };
}

export function getActive(store: WorkStateStore): WorkState | undefined {
  return store.states.find((state) => state.id === store.activeId && state.status === 'active');
}

export function validateStore(value: unknown): WorkStateStore {
  if (!value || typeof value !== 'object') {
    throw new Error('WorkState data is not an object.');
  }
  const candidate = value as Partial<WorkStateStore>;
  if (candidate.version !== 1 || !Array.isArray(candidate.states)) {
    throw new Error('Unsupported or malformed WorkState data.');
  }
  return {
    version: 1,
    activeId: typeof candidate.activeId === 'string' ? candidate.activeId : undefined,
    states: candidate.states.map(validateWorkState)
  };
}

function validateWorkState(value: unknown): WorkState {
  if (!value || typeof value !== 'object') {
    throw new Error('Malformed WorkState entry.');
  }
  const state = value as WorkState;
  const requiredStrings = ['id', 'name', 'goal', 'createdAt', 'updatedAt', 'status'] as const;
  for (const key of requiredStrings) {
    if (typeof state[key] !== 'string') {
      throw new Error(`Malformed WorkState entry: ${key} is missing.`);
    }
  }
  return {
    ...state,
    currentState: state.currentState ?? '',
    completed: Array.isArray(state.completed) ? state.completed : [],
    blockers: Array.isArray(state.blockers) ? state.blockers : [],
    decisions: Array.isArray(state.decisions) ? state.decisions : [],
    rejectedApproaches: Array.isArray(state.rejectedApproaches) ? state.rejectedApproaches : [],
    relevantFiles: Array.isArray(state.relevantFiles) ? state.relevantFiles : [],
    testNotes: state.testNotes ?? '',
    nextAction: state.nextAction ?? '',
    dna: Array.isArray(state.dna) ? state.dna : [],
    memories: Array.isArray(state.memories) ? state.memories : [],
    reviewItems: Array.isArray(state.reviewItems) ? state.reviewItems : [],
    sessions: Array.isArray(state.sessions) ? state.sessions : [],
    contextLayers: validateContextLayers(state.contextLayers),
    lastSnapshot: validateSnapshot(state.lastSnapshot),
    reconciliations: Array.isArray(state.reconciliations) ? state.reconciliations : [],
    conflicts: Array.isArray(state.conflicts) ? state.conflicts : []
  };
}

function validateSnapshot(value: unknown): WorkspaceSnapshot | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const snapshot = value as Partial<WorkspaceSnapshot>;
  return {
    timestamp: typeof snapshot.timestamp === 'string' ? snapshot.timestamp : nowIso(),
    projectName: typeof snapshot.projectName === 'string' ? snapshot.projectName : 'Workspace',
    branch: typeof snapshot.branch === 'string' ? snapshot.branch : undefined,
    changedFiles: Array.isArray(snapshot.changedFiles) ? snapshot.changedFiles : [],
    recentCommits: Array.isArray(snapshot.recentCommits) ? snapshot.recentCommits : [],
    evidenceSummary: Array.isArray(snapshot.evidenceSummary) ? snapshot.evidenceSummary : []
  };
}

function validateContextLayers(value: unknown): ContextLayers {
  if (!value || typeof value !== 'object') {
    return emptyContextLayers();
  }
  const layers = value as Partial<ContextLayers>;
  return {
    project: {
      decisions: Array.isArray(layers.project?.decisions) ? layers.project.decisions : [],
      rejectedApproaches: Array.isArray(layers.project?.rejectedApproaches) ? layers.project.rejectedApproaches : [],
      constraints: Array.isArray(layers.project?.constraints) ? layers.project.constraints : [],
      patterns: Array.isArray(layers.project?.patterns) ? layers.project.patterns : []
    },
    session: {
      focus: typeof layers.session?.focus === 'string' ? layers.session.focus : undefined,
      objective: typeof layers.session?.objective === 'string' ? layers.session.objective : undefined,
      currentState: typeof layers.session?.currentState === 'string' ? layers.session.currentState : undefined,
      currentAgent: typeof layers.session?.currentAgent === 'string' ? layers.session.currentAgent : undefined,
      previousAgent: typeof layers.session?.previousAgent === 'string' ? layers.session.previousAgent : undefined,
      nextAction: typeof layers.session?.nextAction === 'string' ? layers.session.nextAction : undefined,
      recentFiles: Array.isArray(layers.session?.recentFiles) ? layers.session.recentFiles : []
    }
  };
}
