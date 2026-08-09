import { describe, expect, it } from 'vitest';
import { createWorkState, emptyStore, getActive, validateStore } from '../src/domain/model';
import {
  addDecision,
  addRejectedApproach,
  archiveWorkState,
  deleteDecision,
  deleteRejectedApproach,
  editDecision,
  editRejectedApproach,
  updateWorkState
} from '../src/domain/mutations';

describe('WorkState model', () => {
  it('creates, edits, archives, and reloads a WorkState', () => {
    let state = createWorkState({
      name: 'Payment Integration',
      goal: 'Implement payments.',
      currentState: 'Webhook implementation.',
      blocker: 'Verification fails.',
      nextAction: 'Check raw body.'
    });

    state = updateWorkState(state, {
      currentState: 'Webhook verification.',
      completed: ['Payment service'],
      blockers: ['400 response']
    });
    state = addDecision(state, 'Use server-side verification.');
    state = addRejectedApproach(state, 'Client-side verification', 'Security concern.');

    expect(state.status).toBe('active');
    expect(state.completed).toEqual(['Payment service']);
    expect(state.decisions).toHaveLength(1);
    expect(state.rejectedApproaches).toHaveLength(1);
    expect(state.dna.length).toBeGreaterThanOrEqual(5);

    const archived = archiveWorkState(state);
    expect(archived.status).toBe('archived');

    const store = { ...emptyStore(), activeId: state.id, states: [state] };
    const reloaded = validateStore(JSON.parse(JSON.stringify(store)));
    expect(getActive(reloaded)?.name).toBe('Payment Integration');
  });

  it('rejects corrupted persisted data', () => {
    expect(() => validateStore({ version: 1, states: [{ id: 'bad' }] })).toThrow();
  });

  it('edits and deletes decisions and rejected approaches without rewriting Task DNA', () => {
    let state = createWorkState({ name: 'Task', goal: 'Goal' });
    state = addDecision(state, 'Original decision', 'Original reason');
    state = addRejectedApproach(state, 'Original approach', 'Original rejection reason');
    const decisionId = state.decisions[0]!.id;
    const rejectedId = state.rejectedApproaches[0]!.id;
    const dnaCount = state.dna.length;

    state = editDecision(state, decisionId, 'Updated decision', 'Updated reason');
    state = editRejectedApproach(state, rejectedId, 'Updated approach', 'Updated rejection reason');

    expect(state.decisions[0]?.decision).toBe('Updated decision');
    expect(state.rejectedApproaches[0]?.approach).toBe('Updated approach');
    expect(state.dna.length).toBeGreaterThan(dnaCount);

    state = deleteDecision(state, decisionId);
    state = deleteRejectedApproach(state, rejectedId);

    expect(state.decisions).toHaveLength(0);
    expect(state.rejectedApproaches).toHaveLength(0);
    expect(state.dna.some((event) => event.title.includes('Original decision'))).toBe(true);
  });
});
