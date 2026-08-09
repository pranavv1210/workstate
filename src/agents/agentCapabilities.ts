export type CapabilityValue = 'YES' | 'NO' | 'PARTIAL' | 'PROPOSED' | 'UNKNOWN';

export interface AgentCapabilities {
  providerId: string;
  displayName: string;
  sessionObservable: CapabilityValue;
  conversationAccessible: CapabilityValue;
  agentResponseAccessible: CapabilityValue;
  userMessageAccessible: CapabilityValue;
  sessionLifecycleAccessible: CapabilityValue;
  sessionEndDetectable: CapabilityValue;
  contextExhaustionDetectable: CapabilityValue;
  canProvideContext: CapabilityValue;
  canInjectContext: CapabilityValue;
  canCreateSession: CapabilityValue;
  canContinueSession: CapabilityValue;
  stableApi: CapabilityValue;
  proposedApi: CapabilityValue;
  providerSpecificAdapterRequired: CapabilityValue;
  fallbackAvailable: CapabilityValue;
  fallbackLabel: string;
  notes: string;
}

export function copyAssistedCapabilities(providerId: string, displayName: string, notes: string): AgentCapabilities {
  return {
    providerId,
    displayName,
    sessionObservable: 'NO',
    conversationAccessible: 'NO',
    agentResponseAccessible: 'NO',
    userMessageAccessible: 'NO',
    sessionLifecycleAccessible: 'NO',
    sessionEndDetectable: 'NO',
    contextExhaustionDetectable: 'NO',
    canProvideContext: 'YES',
    canInjectContext: 'NO',
    canCreateSession: 'NO',
    canContinueSession: 'NO',
    stableApi: 'PARTIAL',
    proposedApi: 'PARTIAL',
    providerSpecificAdapterRequired: 'YES',
    fallbackAvailable: 'YES',
    fallbackLabel: 'Copy-assisted handoff',
    notes
  };
}
