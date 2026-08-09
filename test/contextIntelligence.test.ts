import { describe, expect, it } from 'vitest';
import { defaultAgentAdapters } from '../src/agents/agentRegistry';
import { extractContextMemories } from '../src/context/contextExtractor';
import { confirmReviewItem, mergeContextMemories } from '../src/context/contextMerger';
import { createWorkState } from '../src/domain/model';
import { recordAgentSession } from '../src/sessions/sessionEvents';

describe('context intelligence', () => {
  it('extracts explicit engineering facts without external AI', () => {
    const memories = extractContextMemories(
      'Implemented the Explore to Ride Lobby navigation fix. Decision: keep the existing router. Do not navigate directly to Ride Details because it bypasses the lobby. Tests pass. Next: manually test joining a ride.'
    );

    expect(memories.map((memory) => memory.type)).toEqual(
      expect.arrayContaining(['completed', 'decision', 'rejected', 'testResult', 'nextAction'])
    );
    expect(memories.find((memory) => memory.type === 'completed')?.confidence).toBe('confirmed');
    expect(memories.find((memory) => memory.type === 'nextAction')?.confidence).toBe('suggested');
  });

  it('merges confirmed context and deduplicates repeated memories', () => {
    const state = createWorkState({ name: 'JourneySync', goal: 'Preserve context.' });
    const memories = extractContextMemories('Implemented Explore navigation. Implemented Explore navigation. Decision: use Ride Lobby flow.');
    const next = mergeContextMemories(state, memories);

    expect(next.completed).toEqual(['Explore navigation']);
    expect(next.decisions.map((item) => item.decision)).toEqual(['use Ride Lobby flow']);
    expect(next.memories).toHaveLength(2);
  });

  it('keeps suggested context pending until review confirmation', () => {
    const state = createWorkState({ name: 'JourneySync', goal: 'Preserve context.' });
    const [suggestion] = extractContextMemories('Next: test the Ride Lobby flow.');
    const withReview = mergeContextMemories(state, [suggestion]);

    expect(withReview.nextAction).toBe('');
    expect(withReview.reviewItems?.[0]?.status).toBe('pending');

    const confirmed = confirmReviewItem(withReview, withReview.reviewItems?.[0]?.id ?? '');
    expect(confirmed.nextAction).toBe('test the Ride Lobby flow');
  });

  it('records provider session transitions without provider credentials', () => {
    const state = createWorkState({ name: 'JourneySync', goal: 'Preserve context.' });
    const codex = recordAgentSession(state, 'codex', 'Codex');
    const claude = recordAgentSession(codex, 'claude', 'Claude / Claude Code');

    expect(claude.sessions?.at(-1)?.providerId).toBe('claude');
    expect(claude.contextLayers?.session.currentAgent).toBe('Claude / Claude Code');
    expect(claude.contextLayers?.session.previousAgent).toBe('Codex');
  });

  it('reports copy-assisted provider fallbacks honestly', () => {
    const capabilities = defaultAgentAdapters().map((adapter) => adapter.getCapabilities());

    expect(capabilities).toHaveLength(5);
    expect(capabilities.every((provider) => provider.canProvideContext === 'YES')).toBe(true);
    expect(capabilities.filter((provider) => provider.providerId !== 'other').every((provider) => provider.canInjectContext === 'NO')).toBe(true);
    expect(capabilities.every((provider) => provider.fallbackAvailable === 'YES')).toBe(true);
  });
});
