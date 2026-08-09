import { AgentSession, WorkState, makeId, nowIso } from '../domain/model';

export function recordAgentSession(state: WorkState, providerId: string, displayName: string): WorkState {
  const timestamp = nowIso();
  const sessions = state.sessions ?? [];
  const active = sessions.find((session) => session.providerId === providerId && session.status === 'active');
  if (active) {
    return {
      ...state,
      sessions: sessions.map((session) => (session.id === active.id ? { ...session, lastSeenAt: timestamp } : session)),
      updatedAt: timestamp
    };
  }

  const session: AgentSession = {
    id: makeId('session'),
    providerId,
    displayName,
    startedAt: timestamp,
    lastSeenAt: timestamp,
    status: 'active'
  };
  return {
    ...state,
    sessions: [...sessions.map((item) => ({ ...item, status: 'ended' as const })), session],
    contextLayers: {
      ...(state.contextLayers ?? {
        project: { decisions: [], rejectedApproaches: [], constraints: [], patterns: [] },
        session: { recentFiles: [] }
      }),
      session: {
        ...(state.contextLayers?.session ?? { recentFiles: [] }),
        previousAgent: sessions.find((item) => item.status === 'active')?.displayName,
        currentAgent: displayName
      }
    },
    dna: [
      ...state.dna,
      {
        id: makeId('dna'),
        type: 'session',
        title: `${displayName} handoff prepared.`,
        detail: 'WorkState prepared context using provider-independent copy-assisted handoff.',
        timestamp,
        confidence: 'confirmed',
        source: 'manual'
      }
    ],
    updatedAt: timestamp
  };
}
