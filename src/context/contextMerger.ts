import {
  ContextMemory,
  Decision,
  RejectedApproach,
  ReviewItem,
  TaskDnaEvent,
  WorkState,
  emptyContextLayers,
  makeId,
  nowIso
} from '../domain/model';
import { isReviewable } from './contextConfidence';

export function mergeContextMemories(state: WorkState, memories: ContextMemory[]): WorkState {
  if (memories.length === 0) {
    return state;
  }
  const timestamp = nowIso();
  const existingMemories = state.memories ?? [];
  const memoryKeys = new Set(existingMemories.map(memoryKey));
  const accepted = memories.filter((memory) => !memoryKeys.has(memoryKey(memory)));
  if (accepted.length === 0) {
    return state;
  }

  const reviewItems = [...(state.reviewItems ?? [])];
  const dna: TaskDnaEvent[] = [...state.dna];
  let next: WorkState = {
    ...state,
    memories: [...existingMemories, ...accepted],
    contextLayers: state.contextLayers ?? emptyContextLayers(),
    updatedAt: timestamp
  };

  for (const memory of accepted) {
    if (isReviewable(memory.confidence)) {
      reviewItems.push(toReviewItem(memory));
      dna.push({
        id: makeId('dna'),
        type: 'review',
        title: `Review suggested ${label(memory.type)}.`,
        detail: memory.content,
        timestamp: memory.timestamp,
        confidence: memory.confidence,
        source: memory.source
      });
      continue;
    }

    next = applyConfirmedMemory(next, memory);
    dna.push({
      id: makeId('dna'),
      type: toDnaType(memory.type),
      title: `Context captured: ${label(memory.type)}`,
      detail: memory.content,
      timestamp: memory.timestamp,
      confidence: memory.confidence,
      source: memory.source
    });
  }

  return {
    ...next,
    reviewItems,
    dna
  };
}

export function confirmReviewItem(state: WorkState, id: string): WorkState {
  const item = (state.reviewItems ?? []).find((candidate) => candidate.id === id);
  if (!item) {
    return state;
  }
  const memory: ContextMemory = {
    id: makeId('memory'),
    type: item.type,
    content: item.content,
    reason: item.reason,
    confidence: 'confirmed',
    source: item.source,
    timestamp: nowIso(),
    evidence: item.evidence
  };
  const withStatus = {
    ...state,
    memories: (state.memories ?? []).filter((memory) => memoryKey(memory) !== `${item.type}:${item.content.toLowerCase()}`),
    reviewItems: (state.reviewItems ?? []).map((candidate) =>
      candidate.id === id ? { ...candidate, status: 'confirmed' as const } : candidate
    )
  };
  return mergeContextMemories(withStatus, [memory]);
}

export function rejectReviewItem(state: WorkState, id: string): WorkState {
  const timestamp = nowIso();
  return {
    ...state,
    reviewItems: (state.reviewItems ?? []).map((item) => (item.id === id ? { ...item, status: 'rejected' as const } : item)),
    dna: [
      ...state.dna,
      {
        id: makeId('dna'),
        type: 'review',
        title: 'Suggested context rejected.',
        timestamp,
        confidence: 'rejected',
        source: 'manual'
      }
    ],
    updatedAt: timestamp
  };
}

export function recordFileActivity(state: WorkState, file: string): WorkState {
  const layers = state.contextLayers ?? emptyContextLayers();
  const recentFiles = [file, ...layers.session.recentFiles.filter((item) => item !== file)].slice(0, 12);
  return {
    ...state,
    contextLayers: {
      ...layers,
      session: {
        ...layers.session,
        recentFiles
      }
    }
  };
}

function applyConfirmedMemory(state: WorkState, memory: ContextMemory): WorkState {
  const layers = state.contextLayers ?? emptyContextLayers();
  switch (memory.type) {
    case 'completed':
      return {
        ...state,
        completed: appendUnique(state.completed, memory.content),
        contextLayers: {
          ...layers,
          session: { ...layers.session, currentState: memory.content }
        }
      };
    case 'decision': {
      if (state.decisions.some((item) => item.decision.toLowerCase() === memory.content.toLowerCase())) {
        return state;
      }
      const decision: Decision = {
        id: makeId('decision'),
        decision: memory.content,
        reason: memory.reason,
        timestamp: memory.timestamp
      };
      return {
        ...state,
        decisions: [...state.decisions, decision],
        contextLayers: {
          ...layers,
          project: { ...layers.project, decisions: appendUnique(layers.project.decisions, memory.content) }
        }
      };
    }
    case 'rejected': {
      if (state.rejectedApproaches.some((item) => item.approach.toLowerCase() === memory.content.toLowerCase())) {
        return state;
      }
      const rejected: RejectedApproach = {
        id: makeId('rejected'),
        approach: memory.content,
        reason: memory.reason ?? 'Captured from explicit context.',
        timestamp: memory.timestamp
      };
      return {
        ...state,
        rejectedApproaches: [...state.rejectedApproaches, rejected],
        contextLayers: {
          ...layers,
          project: { ...layers.project, rejectedApproaches: appendUnique(layers.project.rejectedApproaches, memory.content) }
        }
      };
    }
    case 'blocker':
      return { ...state, blockers: appendUnique(state.blockers, memory.content) };
    case 'testResult':
      return {
        ...state,
        testNotes: state.testNotes.trim() ? `${state.testNotes.trim()}\n\n${memory.timestamp.slice(0, 10)}\n${memory.content}` : `${memory.timestamp.slice(0, 10)}\n${memory.content}`
      };
    case 'nextAction':
      return { ...state, nextAction: memory.content };
    case 'currentState':
      return { ...state, currentState: memory.content };
    case 'note':
    case 'fileActivity':
    case 'session':
      return state;
  }
}

function toReviewItem(memory: ContextMemory): ReviewItem {
  return {
    id: makeId('review'),
    type: memory.type,
    content: memory.content,
    reason: memory.reason,
    confidence: memory.confidence === 'suggested' ? 'suggested' : 'needs_review',
    source: memory.source,
    timestamp: memory.timestamp,
    evidence: memory.evidence,
    status: 'pending'
  };
}

function appendUnique(items: string[], item: string): string[] {
  const normalized = item.toLowerCase();
  return items.some((candidate) => candidate.toLowerCase() === normalized) ? items : [...items, item];
}

function memoryKey(memory: ContextMemory): string {
  return `${memory.type}:${memory.content.toLowerCase()}`;
}

function label(type: ContextMemory['type']): string {
  switch (type) {
    case 'testResult':
      return 'test result';
    case 'nextAction':
      return 'next action';
    case 'currentState':
      return 'current state';
    case 'fileActivity':
      return 'file activity';
    default:
      return type;
  }
}

function toDnaType(type: ContextMemory['type']): TaskDnaEvent['type'] {
  switch (type) {
    case 'completed':
      return 'completed';
    case 'decision':
      return 'decision';
    case 'rejected':
      return 'rejected';
    case 'blocker':
      return 'blocker';
    case 'testResult':
      return 'test';
    case 'nextAction':
      return 'nextAction';
    case 'session':
      return 'session';
    default:
      return 'context';
  }
}
