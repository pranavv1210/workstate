import { describe, expect, it } from 'vitest';
import { generateHandoff } from '../src/domain/handoff';
import { createWorkState } from '../src/domain/model';
import { addDecision, addRejectedApproach, recordHandoff, updateWorkState } from '../src/domain/mutations';

describe('handoff generation', () => {
  it('generates a concise quick handoff with the important state', () => {
    let state = createWorkState({
      name: 'Payment Integration',
      goal: 'Implement payment processing.',
      currentState: 'Webhook implementation.',
      blocker: 'Webhook verification fails.',
      nextAction: 'Investigate raw-body handling.'
    });
    state = updateWorkState(state, { completed: ['Payment service', 'Webhook endpoint'] });
    state = addRejectedApproach(state, 'Client-side verification', 'security concerns');

    const handoff = generateHandoff(state, 'quick');

    expect(handoff).toContain('WORKSTATE HANDOFF');
    expect(handoff).toContain('Payment Integration');
    expect(handoff).toContain('Webhook implementation.');
    expect(handoff).toContain('Webhook verification fails.');
    expect(handoff).toContain('Decisions:');
    expect(handoff).toContain('Client-side verification');
    expect(handoff).toContain('Reason: security concerns');
    expect(handoff).toContain('Rule: Do not return to this without new evidence.');
    expect(handoff).toContain('Test Status:');
    expect(handoff).toContain('Investigate raw-body handling.');
  });

  it('generates a full handoff with decisions, rejected approaches, blockers, tests, next action, and git context', () => {
    let state = createWorkState({
      name: 'Payment Integration',
      goal: 'Implement payment processing.',
      currentState: 'Webhook implementation.',
      blocker: 'Webhook verification fails.',
      nextAction: 'Investigate raw-body handling.'
    });
    state = updateWorkState(state, {
      completed: ['Payment service'],
      testNotes: '12 passing, 1 failing.',
      relevantFiles: ['src/payment.ts', '.env']
    });
    state = addDecision(state, 'Server-side verification.', 'Security and trust boundary.');
    state = addRejectedApproach(state, 'Client-side verification', 'Security concern.');

    const handoff = generateHandoff(
      state,
      'full',
      { branch: 'main', changedFiles: ['src/payment.ts'], recentCommits: ['abc123 init'] },
      ['.env']
    );

    expect(handoff).toContain('DECISIONS');
    expect(handoff).toContain('Server-side verification.');
    expect(handoff).toContain('Reason: Security and trust boundary.');
    expect(handoff).toContain("DON'T REPEAT");
    expect(handoff).toContain('Client-side verification');
    expect(handoff).toContain('Reason: Security concern.');
    expect(handoff).toContain('Rule: Do not return to this without new evidence.');
    expect(handoff).toContain('Webhook verification fails.');
    expect(handoff).toContain('12 passing, 1 failing.');
    expect(handoff).toContain('Branch: main');
    expect(handoff).toContain('Investigate raw-body handling.');
    expect(handoff).not.toContain('.env');
  });

  it('records handoff events in Task DNA', () => {
    const state = recordHandoff(createWorkState({ name: 'Task', goal: 'Goal' }), 'quick', 'content');

    expect(state.latestHandoff?.content).toBe('content');
    expect(state.dna.some((event) => event.type === 'handoff')).toBe(true);
  });

  it('keeps the exact acceptance scenario understandable in quick mode', () => {
    let state = createWorkState({
      name: 'Payment Integration',
      goal: 'Implement payment processing.',
      currentState: 'Webhook implementation.',
      blocker: 'Webhook verification returns 400.',
      nextAction: 'Investigate raw-body handling.'
    });
    state = updateWorkState(state, {
      completed: ['Payment service', 'Order integration', 'Webhook endpoint'],
      relevantFiles: ['payment_service.ts', 'webhook.ts'],
      testNotes: '12 passing\n1 failing'
    });
    state = addDecision(state, 'Server-side verification.');
    state = addRejectedApproach(state, 'Client-side verification', 'security concern');

    const handoff = generateHandoff(state, 'quick');

    for (const expected of [
      'Payment Integration',
      'Implement payment processing.',
      'Webhook implementation.',
      'Payment service',
      'Server-side verification.',
      'Client-side verification',
      'Webhook verification returns 400.',
      'payment_service.ts',
      'webhook.ts',
      '12 passing',
      '1 failing',
      'Investigate raw-body handling.'
    ]) {
      expect(handoff).toContain(expected);
    }
  });
});
