import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateHandoff } from '../src/domain/handoff';
import { createWorkState, emptyStore } from '../src/domain/model';
import { applyQuickUpdate } from '../src/domain/mutations';
import { WorkStateRepository } from '../src/storage/workStateRepository';

describe('Quick Update', () => {
  it('applies every supported update type and records Task DNA events', () => {
    let state = createWorkState({
      name: 'Payment Integration',
      goal: 'Implement Razorpay payments.'
    });

    state = applyQuickUpdate(state, { type: 'completed', content: 'Payment service implemented.' });
    state = applyQuickUpdate(state, { type: 'currentState', content: 'Webhook verification now works for valid signatures.' });
    state = applyQuickUpdate(state, { type: 'blocker', content: 'Invalid signature tests are still failing.', blockerMode: 'add' });
    state = applyQuickUpdate(state, {
      type: 'decision',
      content: 'Use raw request body for signature verification.',
      reason: 'Required for signature verification.'
    });
    state = applyQuickUpdate(state, {
      type: 'rejected',
      content: 'Verify the signature after JSON parsing.',
      reason: 'Parsed bodies change the signed payload.'
    });
    state = applyQuickUpdate(state, { type: 'testResult', content: '18 tests passing, 2 failing.' });
    state = applyQuickUpdate(state, { type: 'nextAction', content: 'Fix invalid signature handling.' });
    state = applyQuickUpdate(state, {
      type: 'note',
      content: 'Issue only occurs when the body is parsed before verification.'
    });

    expect(state.completed).toContain('Payment service implemented.');
    expect(state.currentState).toBe('Webhook verification now works for valid signatures.');
    expect(state.blockers).toContain('Invalid signature tests are still failing.');
    expect(state.decisions[0]?.decision).toBe('Use raw request body for signature verification.');
    expect(state.decisions[0]?.reason).toBe('Required for signature verification.');
    expect(state.rejectedApproaches[0]?.approach).toBe('Verify the signature after JSON parsing.');
    expect(state.testNotes).toContain('18 tests passing, 2 failing.');
    expect(state.nextAction).toBe('Fix invalid signature handling.');
    expect(state.dna.map((event) => event.type)).toEqual([
      'created',
      'completed',
      'updated',
      'blocker',
      'decision',
      'rejected',
      'test',
      'nextAction',
      'note'
    ]);
  });

  it('supports blocker replacement and avoids duplicate completed field entries', () => {
    let state = createWorkState({ name: 'Task', goal: 'Goal', blocker: 'Old blocker.' });

    state = applyQuickUpdate(state, { type: 'blocker', content: 'New blocker.', blockerMode: 'replace' });
    state = applyQuickUpdate(state, { type: 'completed', content: 'Webhook endpoint completed.' });
    state = applyQuickUpdate(state, { type: 'completed', content: 'Webhook endpoint completed.' });

    expect(state.blockers).toEqual(['New blocker.']);
    expect(state.completed).toEqual(['Webhook endpoint completed.']);
    expect(state.dna.filter((event) => event.type === 'completed')).toHaveLength(2);
  });

  it('requires content and a reason for rejected approaches', () => {
    const state = createWorkState({ name: 'Task', goal: 'Goal' });

    expect(() => applyQuickUpdate(state, { type: 'note', content: ' ' })).toThrow('needs content');
    expect(() => applyQuickUpdate(state, { type: 'rejected', content: 'Client-side verification' })).toThrow(
      "Don't Repeat needs a reason."
    );
  });

  it('persists and reloads Quick Updates through the existing repository', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'workstate-quick-update-'));
    const repo = new WorkStateRepository(dir);
    let state = createWorkState({ name: 'Payment Integration', goal: 'Implement Razorpay payments.' });
    state = applyQuickUpdate(state, { type: 'completed', content: 'Payment service implemented.' });
    state = applyQuickUpdate(state, { type: 'nextAction', content: 'Investigate raw-body handling.' });

    await repo.save({ ...emptyStore(), activeId: state.id, states: [state] });
    const reloaded = await repo.load();

    expect(reloaded.states[0]?.completed).toEqual(['Payment service implemented.']);
    expect(reloaded.states[0]?.nextAction).toBe('Investigate raw-body handling.');
    expect(reloaded.states[0]?.dna.map((event) => event.type)).toContain('nextAction');
  });

  it('feeds Quick Updates into Quick and Full Handoffs', () => {
    let state = createWorkState({
      name: 'Payment Integration',
      goal: 'Implement Razorpay payments.'
    });
    state = applyQuickUpdate(state, { type: 'completed', content: 'Payment service implemented.' });
    state = applyQuickUpdate(state, { type: 'decision', content: 'Use server-side verification.' });
    state = applyQuickUpdate(state, { type: 'rejected', content: 'Client-side verification', reason: 'Security concern.' });
    state = applyQuickUpdate(state, { type: 'blocker', content: 'Webhook returns 400.' });
    state = applyQuickUpdate(state, { type: 'testResult', content: '18 passing, 2 failing.' });
    state = applyQuickUpdate(state, { type: 'nextAction', content: 'Investigate raw-body handling.' });

    const quick = generateHandoff(state, 'quick');
    const full = generateHandoff(state, 'full');

    for (const handoff of [quick, full]) {
      expect(handoff).toContain('Payment service implemented.');
      expect(handoff).toContain('Use server-side verification.');
      expect(handoff).toContain('Client-side verification');
      expect(handoff).toContain('Webhook returns 400.');
      expect(handoff).toContain('18 passing, 2 failing.');
      expect(handoff).toContain('Investigate raw-body handling.');
    }
  });

  it('does not let note captures mutate structured fields or relevant files', () => {
    const state = createWorkState({ name: 'Task', goal: 'Goal' });
    const next = applyQuickUpdate(state, { type: 'note', content: 'Do not inspect .env during this task.' });

    expect(next.goal).toBe(state.goal);
    expect(next.currentState).toBe(state.currentState);
    expect(next.blockers).toEqual([]);
    expect(next.decisions).toEqual([]);
    expect(next.relevantFiles).toEqual([]);
    expect(next.dna.at(-1)?.type).toBe('note');
  });
});

