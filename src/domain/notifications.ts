import { ContextSummary } from './context';

export interface NotificationSettings {
  enabled: boolean;
  welcomeBack: boolean;
  significantChanges: boolean;
  branchChanges: boolean;
}

export interface NotificationMemory {
  welcomeKeys: string[];
  significantChangeKeys: string[];
  branchChangeKeys: string[];
  recentChangedFiles: string[];
  lastBranch?: string;
}

export const defaultNotificationMemory: NotificationMemory = {
  welcomeKeys: [],
  significantChangeKeys: [],
  branchChangeKeys: [],
  recentChangedFiles: []
};

export function shouldShowWelcomeBack(
  summary: ContextSummary,
  stateId: string | undefined,
  updatedAt: string | undefined,
  settings: NotificationSettings,
  memory: NotificationMemory
): boolean {
  if (!settings.enabled || !settings.welcomeBack || !summary.hasContext || !stateId || !updatedAt) {
    return false;
  }
  return !memory.welcomeKeys.includes(welcomeKey(stateId, updatedAt));
}

export function rememberWelcomeBack(memory: NotificationMemory, stateId: string, updatedAt: string): NotificationMemory {
  return capList({ ...memory, welcomeKeys: [...memory.welcomeKeys, welcomeKey(stateId, updatedAt)] });
}

export function trackChangedFile(memory: NotificationMemory, relativePath: string, limit = 8): NotificationMemory {
  const recentChangedFiles = [relativePath, ...memory.recentChangedFiles.filter((item) => item !== relativePath)].slice(0, limit);
  return { ...memory, recentChangedFiles };
}

export function shouldSuggestCaptureProgress(settings: NotificationSettings, memory: NotificationMemory, threshold = 3): boolean {
  if (!settings.enabled || !settings.significantChanges) {
    return false;
  }
  const distinct = [...new Set(memory.recentChangedFiles)];
  if (distinct.length < threshold) {
    return false;
  }
  return !memory.significantChangeKeys.includes(significantKey(distinct));
}

export function rememberCaptureProgressSuggestion(memory: NotificationMemory): NotificationMemory {
  return capList({
    ...memory,
    significantChangeKeys: [...memory.significantChangeKeys, significantKey([...new Set(memory.recentChangedFiles)])],
    recentChangedFiles: []
  });
}

export function shouldShowBranchChange(
  nextBranch: string | undefined,
  settings: NotificationSettings,
  memory: NotificationMemory
): boolean {
  if (!settings.enabled || !settings.branchChanges || !nextBranch) {
    return false;
  }
  if (!memory.lastBranch || memory.lastBranch === nextBranch) {
    return false;
  }
  return !memory.branchChangeKeys.includes(branchKey(memory.lastBranch, nextBranch));
}

export function rememberBranch(memory: NotificationMemory, nextBranch: string | undefined): NotificationMemory {
  return nextBranch ? { ...memory, lastBranch: nextBranch } : memory;
}

export function rememberBranchChange(memory: NotificationMemory, nextBranch: string): NotificationMemory {
  const previous = memory.lastBranch;
  if (!previous) {
    return rememberBranch(memory, nextBranch);
  }
  return capList({
    ...memory,
    branchChangeKeys: [...memory.branchChangeKeys, branchKey(previous, nextBranch)],
    lastBranch: nextBranch
  });
}

function welcomeKey(stateId: string, updatedAt: string): string {
  return `${stateId}:${updatedAt}`;
}

function significantKey(files: string[]): string {
  return files.slice().sort().join('|');
}

function branchKey(previous: string, next: string): string {
  return `${previous}->${next}`;
}

function capList(memory: NotificationMemory, limit = 30): NotificationMemory {
  return {
    ...memory,
    welcomeKeys: memory.welcomeKeys.slice(-limit),
    significantChangeKeys: memory.significantChangeKeys.slice(-limit),
    branchChangeKeys: memory.branchChangeKeys.slice(-limit)
  };
}

