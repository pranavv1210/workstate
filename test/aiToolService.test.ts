import { describe, expect, it } from 'vitest';
import { WorkStateToolService } from '../src/ai/workstateToolService';
import { createWorkState, GitContext } from '../src/domain/model';
import { applyQuickUpdate } from '../src/domain/mutations';

const git: GitContext = {
  branch: 'feature/ride-lobby',
  changedFiles: ['lib/explore_screen.dart', '.env', 'test/navigation_test.dart'],
  recentCommits: ['abc123 fix Explore navigation']
};

function context() {
  let state = createWorkState({
    name: 'JourneySync',
    goal: 'Preserve project context across AI coding sessions.'
  });
  state = applyQuickUpdate(state, { type: 'completed', content: 'routing fixed' });
  state = applyQuickUpdate(state, { type: 'decision', content: 'Ride selection enters Ride Lobby', reason: 'Keeps flow consistent.' });
  state = applyQuickUpdate(state, { type: 'rejected', content: 'direct Explore to Details', reason: 'Bypasses Ride Lobby.' });
  state = applyQuickUpdate(state, { type: 'testResult', content: 'navigation tests passing' });
  state = applyQuickUpdate(state, { type: 'nextAction', content: 'manual ride-join test' });
  return {
    state,
    projectName: 'JourneySync',
    git,
    exclusions: ['.env', '**/.env']
  };
}

describe('WorkStateToolService', () => {
  it('returns compact current context without excluded files', () => {
    const service = new WorkStateToolService();
    const output = service.getContext(context(), 'current');

    expect(output).toContain('WORKSTATE CONTEXT');
    expect(output).toContain('Project: JourneySync');
    expect(output).toContain('Ride selection enters Ride Lobby');
    expect(output).toContain('lib/explore_screen.dart');
    expect(output).not.toContain('.env');
  });

  it('returns resume state with decisions, rejected approaches, tests, git, and next action', () => {
    const service = new WorkStateToolService();
    const output = service.getResumeState(context());

    expect(output).toContain('Current focus:');
    expect(output).toContain('Recently completed:');
    expect(output).toContain('routing fixed');
    expect(output).toContain('Do not repeat direct Explore to Details');
    expect(output).toContain('navigation tests passing');
    expect(output).toContain('Next:');
    expect(output).toContain('manual ride-join test');
    expect(output).toContain('Branch: feature/ride-lobby');
  });

  it('updates context through existing mutation and memory pipeline', () => {
    const service = new WorkStateToolService();
    const result = service.updateContext(context(), {
      type: 'completed',
      content: 'Ride Lobby smoke test completed',
      evidence: 'agent update'
    });

    expect(result.message).toBe('Saved completed to WorkState.');
    expect(result.state.completed).toContain('Ride Lobby smoke test completed');
    expect(result.state.memories?.some((item) => item.source === 'agent-adapter' && item.evidence === 'agent update')).toBe(true);
  });

  it('requires a reason for rejected approaches', () => {
    const service = new WorkStateToolService();

    expect(() =>
      service.updateContext(context(), {
        type: 'rejected',
        content: 'skip lobby validation'
      })
    ).toThrow("Don't Repeat needs a reason.");
  });

  it('saves decisions and deduplicates through the context engine', () => {
    const service = new WorkStateToolService();
    const first = service.saveDecision(context(), {
      decision: 'Use Ride Lobby before active ride flow',
      reason: 'Matches navigation model.'
    });
    const second = service.saveDecision({ ...context(), state: first.state }, {
      decision: 'Use Ride Lobby before active ride flow',
      reason: 'Matches navigation model.'
    });

    expect(second.state.decisions.filter((item) => item.decision === 'Use Ride Lobby before active ride flow')).toHaveLength(1);
  });

  it('reconciles workspace evidence and records bootstrap context', () => {
    const service = new WorkStateToolService();
    const result = service.reconcile(context());

    expect(result.message).toContain('Initial project context reconstructed');
    expect(result.state.lastSnapshot?.branch).toBe('feature/ride-lobby');
    expect(result.state.reviewItems?.some((item) => item.source === 'git')).toBe(true);
  });

  it('generates a target-agent handoff without binding context to the provider', () => {
    const service = new WorkStateToolService();
    const result = service.getHandoff(context(), 'Claude');

    expect(result.message).toContain('WORKSTATE CONTEXT');
    expect(result.message).toContain('Target agent: Claude / Claude Code');
    expect(result.message.toLowerCase()).toContain('copy-assisted');
    expect(result.state.latestHandoff?.content).toContain('JourneySync');
  });
});
