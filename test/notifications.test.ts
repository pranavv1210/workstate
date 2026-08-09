import { describe, expect, it } from 'vitest';
import {
  defaultNotificationMemory,
  rememberBranch,
  rememberBranchChange,
  rememberCaptureProgressSuggestion,
  rememberWelcomeBack,
  shouldShowBranchChange,
  shouldShowWelcomeBack,
  shouldSuggestCaptureProgress,
  trackChangedFile
} from '../src/domain/notifications';

const enabled = {
  enabled: true,
  welcomeBack: true,
  significantChanges: true,
  branchChanges: true
};

describe('notification decisions', () => {
  it('deduplicates welcome-back notifications across restarts', () => {
    const summary = {
      projectName: 'JourneySync',
      focus: 'Explore navigation',
      lastActivity: '2 hours ago',
      summary: 'Fixed navigation',
      next: 'Test flow',
      recent: ['Fixed navigation'],
      decisions: [],
      relevantFiles: [],
      hasContext: true
    };

    expect(shouldShowWelcomeBack(summary, 'state-1', '2026-08-09T10:00:00.000Z', enabled, defaultNotificationMemory)).toBe(true);
    const memory = rememberWelcomeBack(defaultNotificationMemory, 'state-1', '2026-08-09T10:00:00.000Z');
    expect(shouldShowWelcomeBack(summary, 'state-1', '2026-08-09T10:00:00.000Z', enabled, memory)).toBe(false);
  });

  it('does not show welcome-back notifications when disabled or context is empty', () => {
    const emptySummary = {
      projectName: 'JourneySync',
      focus: 'JourneySync',
      lastActivity: 'No activity captured yet',
      summary: 'No context',
      next: 'Capture',
      recent: [],
      decisions: [],
      relevantFiles: [],
      hasContext: false
    };

    expect(shouldShowWelcomeBack(emptySummary, 'state-1', 'date', enabled, defaultNotificationMemory)).toBe(false);
    expect(shouldShowWelcomeBack({ ...emptySummary, hasContext: true }, 'state-1', 'date', { ...enabled, enabled: false }, defaultNotificationMemory)).toBe(false);
  });

  it('requires meaningful activity before suggesting capture progress', () => {
    let memory = trackChangedFile(defaultNotificationMemory, 'a.ts');
    memory = trackChangedFile(memory, 'b.ts');

    expect(shouldSuggestCaptureProgress(enabled, memory)).toBe(false);

    memory = trackChangedFile(memory, 'c.ts');
    expect(shouldSuggestCaptureProgress(enabled, memory)).toBe(true);

    const remembered = rememberCaptureProgressSuggestion(memory);
    expect(shouldSuggestCaptureProgress(enabled, remembered)).toBe(false);
  });

  it('deduplicates branch-change notifications', () => {
    let memory = rememberBranch(defaultNotificationMemory, 'main');

    expect(shouldShowBranchChange('feature/ride-lobby', enabled, memory)).toBe(true);
    memory = rememberBranchChange(memory, 'feature/ride-lobby');
    expect(shouldShowBranchChange('feature/ride-lobby', enabled, memory)).toBe(false);
    expect(shouldShowBranchChange('main', { ...enabled, branchChanges: false }, memory)).toBe(false);
  });
});

