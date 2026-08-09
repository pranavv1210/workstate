export type WorkStateStatus = 'active' | 'paused' | 'completed' | 'archived';

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
    | 'archived';
  title: string;
  detail?: string;
  timestamp: string;
}

export interface GitContext {
  branch?: string;
  changedFiles: string[];
  recentCommits: string[];
  unavailableReason?: string;
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
  latestHandoff?: {
    mode: HandoffMode;
    content: string;
    createdAt: string;
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
    ]
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
    dna: Array.isArray(state.dna) ? state.dna : []
  };
}
