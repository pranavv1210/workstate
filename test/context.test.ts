import { describe, expect, it } from 'vitest';
import { generateContinuationContext, ensureWorkspaceContext, summarizeContext } from '../src/domain/context';
import { createWorkState, emptyStore } from '../src/domain/model';
import { addDecision, addRejectedApproach, applyQuickUpdate, updateWorkState } from '../src/domain/mutations';

describe('context reconstruction', () => {
  it('creates a workspace context without forcing manual task fields', () => {
    const result = ensureWorkspaceContext(emptyStore(), 'JourneySync');

    expect(result.created).toBe(true);
    expect(result.state.name).toBe('JourneySync');
    expect(result.store.activeId).toBe(result.state.id);
    expect(result.store.states).toHaveLength(1);
  });

  it('rehydrates the existing newest non-archived WorkState without duplicating records', () => {
    const state = createWorkState({ name: 'Old Task', goal: 'Keep context' });
    const store = { ...emptyStore(), states: [state] };

    const result = ensureWorkspaceContext(store, 'JourneySync');

    expect(result.created).toBe(false);
    expect(result.state.id).toBe(state.id);
    expect(result.store.states).toHaveLength(1);
    expect(result.store.activeId).toBe(state.id);
  });

  it('summarizes old structured data into a context-first home model', () => {
    let state = createWorkState({
      name: 'Explore Ride Navigation',
      goal: 'Fix Explore to Ride Lobby flow.',
      currentState: 'We fixed the Explore navigation flow and were testing the Ride Lobby transition.',
      blocker: 'Need to verify joining a ride.',
      nextAction: 'Continue testing the Explore flow.'
    });
    state = updateWorkState(state, {
      completed: ['Fixed Explore navigation'],
      relevantFiles: ['explore_screen.dart', 'ride_lobby_screen.dart']
    });
    state = addDecision(state, 'Ride selection should enter Ride Lobby first.');

    const summary = summarizeContext(state, 'JourneySync');

    expect(summary.projectName).toBe('JourneySync');
    expect(summary.focus).toContain('Explore navigation');
    expect(summary.summary).toContain('Ride Lobby transition');
    expect(summary.next).toBe('Continue testing the Explore flow.');
    expect(summary.decisions).toContain('Ride selection should enter Ride Lobby first.');
    expect(summary.relevantFiles).toEqual(['explore_screen.dart', 'ride_lobby_screen.dart']);
  });

  it('generates an agent-ready continuation context from captures and Git state', () => {
    let state = createWorkState({ name: 'JourneySync', goal: 'Preserve project context across AI coding sessions.' });
    state = applyQuickUpdate(state, { type: 'completed', content: 'Fixed Explore navigation' });
    state = applyQuickUpdate(state, { type: 'decision', content: 'Use Ride Lobby flow.' });
    state = addRejectedApproach(state, 'Bypass Ride Lobby', 'This skips pre-ride setup.');
    state = applyQuickUpdate(state, { type: 'nextAction', content: 'Test joining a ride from Explore.' });

    const git = {
      branch: 'main',
      changedFiles: ['explore_screen.dart', 'ride_lobby_screen.dart'],
      recentCommits: []
    };
    const summary = summarizeContext(state, 'JourneySync', git);
    const context = generateContinuationContext(summary, state, git);

    expect(context).toContain('WORKSTATE CONTEXT');
    expect(context).toContain('Project: JourneySync');
    expect(context).toContain('Fixed Explore navigation');
    expect(context).toContain('Use Ride Lobby flow.');
    expect(context).toContain('Bypass Ride Lobby');
    expect(context).toContain('explore_screen.dart');
    expect(context).toContain('Test joining a ride from Explore.');
  });
});

