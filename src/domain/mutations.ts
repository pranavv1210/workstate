import { Decision, QuickUpdateInput, RejectedApproach, TaskDnaEvent, WorkState, makeId, nowIso } from './model';

export type EditableFields = Pick<
  WorkState,
  'name' | 'goal' | 'currentState' | 'completed' | 'blockers' | 'relevantFiles' | 'testNotes' | 'nextAction'
>;

export function updateWorkState(state: WorkState, fields: Partial<EditableFields>): WorkState {
  const timestamp = nowIso();
  const next = {
    ...state,
    ...fields,
    updatedAt: timestamp
  };
  const events: TaskDnaEvent[] = [];
  if (fields.currentState && fields.currentState !== state.currentState) {
    events.push(dna('updated', 'Current state updated.', fields.currentState, timestamp));
  }
  if (fields.blockers && fields.blockers.join('\n') !== state.blockers.join('\n')) {
    events.push(dna('blocker', 'Blockers updated.', fields.blockers.join('\n'), timestamp));
  }
  if (fields.completed && fields.completed.join('\n') !== state.completed.join('\n')) {
    events.push(dna('completed', 'Completed work updated.', fields.completed.join('\n'), timestamp));
  }
  next.dna = [...state.dna, ...events];
  return next;
}

export function addDecision(state: WorkState, decision: string, reason?: string): WorkState {
  const timestamp = nowIso();
  const item: Decision = { id: makeId('decision'), decision: decision.trim(), reason: reason?.trim(), timestamp };
  return {
    ...state,
    decisions: [...state.decisions, item],
    dna: [...state.dna, dna('decision', `Decision: ${item.decision}`, item.reason, timestamp)],
    updatedAt: timestamp
  };
}

export function deleteDecision(state: WorkState, id: string): WorkState {
  return { ...state, decisions: state.decisions.filter((item) => item.id !== id), updatedAt: nowIso() };
}

export function editDecision(state: WorkState, id: string, decision: string, reason?: string): WorkState {
  const timestamp = nowIso();
  return {
    ...state,
    decisions: state.decisions.map((item) =>
      item.id === id ? { ...item, decision: decision.trim(), reason: reason?.trim(), timestamp } : item
    ),
    dna: [...state.dna, dna('decision', `Decision edited: ${decision.trim()}`, reason?.trim(), timestamp)],
    updatedAt: timestamp
  };
}

export function addRejectedApproach(state: WorkState, approach: string, reason: string): WorkState {
  const timestamp = nowIso();
  const item: RejectedApproach = {
    id: makeId('rejected'),
    approach: approach.trim(),
    reason: reason.trim(),
    timestamp
  };
  return {
    ...state,
    rejectedApproaches: [...state.rejectedApproaches, item],
    dna: [...state.dna, dna('rejected', `Rejected: ${item.approach}`, item.reason, timestamp)],
    updatedAt: timestamp
  };
}

export function deleteRejectedApproach(state: WorkState, id: string): WorkState {
  return { ...state, rejectedApproaches: state.rejectedApproaches.filter((item) => item.id !== id), updatedAt: nowIso() };
}

export function editRejectedApproach(state: WorkState, id: string, approach: string, reason: string): WorkState {
  const timestamp = nowIso();
  return {
    ...state,
    rejectedApproaches: state.rejectedApproaches.map((item) =>
      item.id === id ? { ...item, approach: approach.trim(), reason: reason.trim(), timestamp } : item
    ),
    dna: [...state.dna, dna('rejected', `Rejected approach edited: ${approach.trim()}`, reason.trim(), timestamp)],
    updatedAt: timestamp
  };
}

export function recordHandoff(state: WorkState, mode: 'quick' | 'full', content: string): WorkState {
  const timestamp = nowIso();
  return {
    ...state,
    latestHandoff: { mode, content, createdAt: timestamp },
    dna: [...state.dna, dna('handoff', `${mode === 'quick' ? 'Quick' : 'Full'} handoff created.`, undefined, timestamp)],
    updatedAt: timestamp
  };
}

export function archiveWorkState(state: WorkState): WorkState {
  const timestamp = nowIso();
  return {
    ...state,
    status: 'archived',
    dna: [...state.dna, dna('archived', 'Task archived.', undefined, timestamp)],
    updatedAt: timestamp
  };
}

export function applyQuickUpdate(state: WorkState, input: QuickUpdateInput): WorkState {
  const content = input.content.trim();
  if (!content) {
    throw new Error('Quick Update needs content.');
  }

  switch (input.type) {
    case 'completed':
      return addCompletedUpdate(state, content);
    case 'currentState':
      return replaceTextField(state, { currentState: content }, 'updated', 'Current State', content);
    case 'blocker':
      return updateBlocker(state, content, input.blockerMode ?? 'add');
    case 'decision':
      return addDecision(state, content, input.reason);
    case 'rejected':
      if (!input.reason?.trim()) {
        throw new Error("Don't Repeat needs a reason.");
      }
      return addRejectedApproach(state, content, input.reason);
    case 'testResult':
      return appendTestResult(state, content);
    case 'nextAction':
      return replaceTextField(state, { nextAction: content }, 'nextAction', 'Next Action', content);
    case 'note':
      return addNoteEvent(state, content);
  }
}

function addCompletedUpdate(state: WorkState, content: string): WorkState {
  const timestamp = nowIso();
  const completed = state.completed.includes(content) ? state.completed : [...state.completed, content];
  return {
    ...state,
    completed,
    dna: [...state.dna, dna('completed', 'Completed', content, timestamp)],
    updatedAt: timestamp
  };
}

function updateBlocker(state: WorkState, content: string, mode: 'add' | 'replace'): WorkState {
  const timestamp = nowIso();
  const blockers = mode === 'replace' ? [content] : state.blockers.includes(content) ? state.blockers : [...state.blockers, content];
  return {
    ...state,
    blockers,
    dna: [...state.dna, dna('blocker', mode === 'replace' ? 'Blocker replaced' : 'Blocker added', content, timestamp)],
    updatedAt: timestamp
  };
}

function appendTestResult(state: WorkState, content: string): WorkState {
  const timestamp = nowIso();
  const entry = `${timestamp.slice(0, 10)}\n${content}`;
  return {
    ...state,
    testNotes: state.testNotes.trim() ? `${state.testNotes.trim()}\n\n${entry}` : entry,
    dna: [...state.dna, dna('test', 'Test Result', content, timestamp)],
    updatedAt: timestamp
  };
}

function replaceTextField(
  state: WorkState,
  field: Pick<Partial<WorkState>, 'currentState' | 'nextAction'>,
  type: TaskDnaEvent['type'],
  title: string,
  detail: string
): WorkState {
  const timestamp = nowIso();
  return {
    ...state,
    ...field,
    dna: [...state.dna, dna(type, title, detail, timestamp)],
    updatedAt: timestamp
  };
}

function addNoteEvent(state: WorkState, content: string): WorkState {
  const timestamp = nowIso();
  return {
    ...state,
    dna: [...state.dna, dna('note', 'Note', content, timestamp)],
    updatedAt: timestamp
  };
}

function dna(type: TaskDnaEvent['type'], title: string, detail?: string, timestamp = nowIso()): TaskDnaEvent {
  return { id: makeId('dna'), type, title, detail, timestamp };
}
