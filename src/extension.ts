import * as path from 'node:path';
import * as vscode from 'vscode';
import { ensureWorkspaceContext, generateContinuationContext, summarizeContext } from './domain/context';
import { generateHandoff } from './domain/handoff';
import {
  NotificationMemory,
  NotificationSettings,
  defaultNotificationMemory,
  rememberBranch,
  rememberBranchChange,
  rememberCaptureProgressSuggestion,
  rememberWelcomeBack,
  shouldShowBranchChange,
  shouldShowWelcomeBack,
  shouldSuggestCaptureProgress,
  trackChangedFile
} from './domain/notifications';
import {
  HandoffMode,
  WorkState,
  WorkStateStore,
  QuickUpdateInput,
  getActive
} from './domain/model';
import {
  addDecision,
  addRejectedApproach,
  applyQuickUpdate,
  archiveWorkState,
  deleteDecision,
  deleteRejectedApproach,
  editDecision,
  editRejectedApproach,
  recordHandoff,
  updateWorkState
} from './domain/mutations';
import { filterExcludedPaths, getDefaultExclusions, isExcludedPath } from './domain/privacy';
import { getGitContext } from './git/gitContext';
import { WorkStateRepository } from './storage/workStateRepository';
import { editWorkStateHtml, handoffHtml, quickUpdateHtml, sidebarHtml, taskDnaHtml } from './ui/html';

let controller: WorkStateController | undefined;

export function activate(context: vscode.ExtensionContext): void {
  controller = new WorkStateController(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('workstate.sidebar', controller),
    vscode.commands.registerCommand('workstate.createWorkState', () => controller?.create()),
    vscode.commands.registerCommand('workstate.quickUpdate', () => controller?.quickUpdate()),
    vscode.commands.registerCommand('workstate.quickCapture', () => controller?.quickCapture()),
    vscode.commands.registerCommand('workstate.openActiveWorkState', () => controller?.openActive()),
    vscode.commands.registerCommand('workstate.editWorkState', () => controller?.editActive()),
    vscode.commands.registerCommand('workstate.createQuickHandoff', () => controller?.createHandoff('quick')),
    vscode.commands.registerCommand('workstate.createFullHandoff', () => controller?.createHandoff('full')),
    vscode.commands.registerCommand('workstate.copyHandoff', () => controller?.copyLatestHandoff()),
    vscode.commands.registerCommand('workstate.viewTaskDna', () => controller?.viewTaskDna()),
    vscode.commands.registerCommand('workstate.archiveWorkState', () => controller?.archiveActive()),
    vscode.workspace.onDidSaveTextDocument((document) => controller?.onDocumentSaved(document)),
    vscode.window.onDidChangeWindowState((state) => controller?.onWindowStateChanged(state))
  );
}

export function deactivate(): void {
  controller = undefined;
}

class WorkStateController implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private readonly repository?: WorkStateRepository;
  private store: WorkStateStore = { version: 1, states: [] };
  private restorationDismissed = false;
  private loadError?: string;
  private readonly notificationKey = 'workstate.notifications.memory';

  constructor(private readonly context: vscode.ExtensionContext) {
    const root = this.workspaceRoot();
    if (root) {
      this.repository = new WorkStateRepository(root);
      void this.load();
    }
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = sidebarHtml(nonce());
    webviewView.webview.onDidReceiveMessage((message) => this.handleSidebarMessage(message), undefined, this.context.subscriptions);
    this.refresh();
  }

  async create(): Promise<void> {
    await this.ensureContext('WorkState is ready for this workspace.');
  }

  async openActive(): Promise<void> {
    const active = this.activeOrNotify();
    if (!active) {
      return;
    }
    await this.editActive();
  }

  async editActive(): Promise<void> {
    const active = this.activeOrNotify();
    if (!active) {
      return;
    }
    this.showEditPanel(active);
  }

  async quickUpdate(): Promise<void> {
    const active = await this.ensureContext();
    if (!active) {
      return;
    }
    this.showQuickUpdatePanel('update');
  }

  async quickCapture(): Promise<void> {
    const active = await this.ensureContext();
    if (!active) {
      return;
    }
    this.showQuickUpdatePanel('capture');
  }

  async createHandoff(mode: HandoffMode): Promise<void> {
    const active = await this.ensureContext();
    if (!active) {
      return;
    }
    const content = await this.buildContextHandoff(active, mode);
    this.replaceState(recordHandoff(active, mode, content));
    await this.persist();
    this.showHandoffPanel(mode, content);
  }

  async copyLatestHandoff(): Promise<void> {
    const active = await this.ensureContext();
    if (!active) {
      return;
    }
    const content = active.latestHandoff?.content ?? (await this.buildContextHandoff(active, 'quick'));
    await this.copyToClipboard(content);
  }

  async viewTaskDna(): Promise<void> {
    const active = this.activeOrNotify();
    if (!active) {
      return;
    }
    const panel = vscode.window.createWebviewPanel('workstate.taskDna', 'Task DNA', vscode.ViewColumn.Active, {
      enableScripts: false
    });
    panel.webview.html = taskDnaHtml(nonce(), active);
  }

  async onDocumentSaved(document: vscode.TextDocument): Promise<void> {
    const root = this.workspaceRoot();
    if (!root || document.uri.scheme !== 'file') {
      return;
    }
    const relative = path.relative(root, document.uri.fsPath).replace(/\\/g, '/');
    if (!relative || relative.startsWith('..') || isExcludedPath(relative, this.exclusions())) {
      return;
    }
    let memory = this.notificationMemory();
    memory = trackChangedFile(memory, relative);
    await this.setNotificationMemory(memory);
    if (shouldSuggestCaptureProgress(this.notificationSettings(), memory)) {
      memory = rememberCaptureProgressSuggestion(memory);
      await this.setNotificationMemory(memory);
      const choice = await vscode.window.showInformationMessage(
        'Looks like you made meaningful progress. Want WorkState to remember it?',
        'Capture Progress',
        'Not Now'
      );
      if (choice === 'Capture Progress') {
        await this.quickCapture();
      }
    }
  }

  async onWindowStateChanged(state: vscode.WindowState): Promise<void> {
    if (!state.focused || !this.workspaceRoot()) {
      return;
    }
    const git = await getGitContext(this.workspaceRoot()!, this.exclusions());
    if (git.unavailableReason) {
      return;
    }
    let memory = this.notificationMemory();
    if (shouldShowBranchChange(git.branch, this.notificationSettings(), memory)) {
      const previous = memory.lastBranch;
      memory = rememberBranchChange(memory, git.branch!);
      await this.setNotificationMemory(memory);
      const choice = await vscode.window.showInformationMessage(
        `Context changed. You are now on ${git.branch}; previous WorkState context may belong to ${previous}.`,
        'Review',
        'Dismiss'
      );
      if (choice === 'Review') {
        await this.createHandoff('quick');
      }
      return;
    }
    await this.setNotificationMemory(rememberBranch(memory, git.branch));
  }

  async archiveActive(): Promise<void> {
    const active = this.activeOrNotify();
    if (!active) {
      return;
    }
    const choice = await vscode.window.showWarningMessage(`Archive "${active.name}"?`, { modal: true }, 'Archive');
    if (choice !== 'Archive') {
      return;
    }
    this.replaceState(archiveWorkState(active));
    this.store.activeId = undefined;
    await this.save('WorkState archived.');
  }

  private async load(): Promise<void> {
    if (!this.repository) {
      return;
    }
    try {
      this.store = await this.repository.load();
      this.loadError = undefined;
      await this.ensureContext(undefined, false);
      await this.maybeShowWelcomeBack();
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : String(error);
      this.store = { version: 1, states: [] };
      vscode.window.showErrorMessage(
        `WorkState could not load local state. Your existing file was backed up where possible. Start fresh or inspect .workstate/workstate.json. ${this.loadError}`
      );
    }
    this.refresh();
  }

  private async persist(): Promise<void> {
    if (!this.repository) {
      throw new Error('Open a folder or workspace before using WorkState.');
    }
    await this.repository.save(this.store);
    this.refresh();
  }

  private async save(message: string): Promise<void> {
    try {
      await this.persist();
      vscode.window.showInformationMessage(message);
    } catch (error) {
      vscode.window.showErrorMessage(
        `WorkState could not be saved. Your previous state is still available. Check workspace permissions and try again. ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private refresh(): void {
    const active = getActive(this.store);
    this.view?.webview.postMessage({
      active,
      summary: summarizeContext(active, this.projectName()),
      restoration: Boolean(active?.latestHandoff && !this.restorationDismissed),
      error: this.loadError
    });
  }

  private replaceState(next: WorkState): void {
    this.store.states = this.store.states.map((state) => (state.id === next.id ? next : state));
    if (!this.store.states.some((state) => state.id === next.id)) {
      this.store.states.unshift(next);
    }
    if (next.status === 'active') {
      this.store.activeId = next.id;
    }
  }

  private activeOrNotify(): WorkState | undefined {
    if (!this.ensureWorkspace()) {
      return undefined;
    }
    const active = getActive(this.store);
    if (!active) {
      vscode.window.showInformationMessage('No active WorkState. Create one first.');
      return undefined;
    }
    return active;
  }

  private async ensureContext(message?: string, notify = true): Promise<WorkState | undefined> {
    if (!this.ensureWorkspace()) {
      return undefined;
    }
    const result = ensureWorkspaceContext(this.store, this.projectName());
    this.store = result.store;
    if (result.created) {
      if (notify && message) {
        await this.save(message);
      } else {
        await this.persist();
      }
    } else {
      this.refresh();
    }
    return result.state;
  }

  private ensureWorkspace(): boolean {
    if (!this.repository) {
      vscode.window.showErrorMessage('WorkState needs an open folder or workspace to store local state.');
      return false;
    }
    return true;
  }

  private workspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  private projectName(): string {
    const root = this.workspaceRoot();
    return root ? path.basename(root) : 'Workspace';
  }

  private exclusions(): string[] {
    return vscode.workspace.getConfiguration('workstate').get<string[]>('exclusions', getDefaultExclusions());
  }

  private async buildHandoff(state: WorkState, mode: HandoffMode): Promise<string> {
    const root = this.workspaceRoot();
    const git = root ? await getGitContext(root, this.exclusions()) : undefined;
    return generateHandoff(state, mode, git, this.exclusions());
  }

  private async buildContextHandoff(state: WorkState, mode: HandoffMode): Promise<string> {
    const root = this.workspaceRoot();
    const git = root ? await getGitContext(root, this.exclusions()) : undefined;
    const summary = summarizeContext(state, this.projectName(), git, this.exclusions());
    if (mode === 'full') {
      return generateContinuationContext(summary, state, git);
    }
    return generateContinuationContext(summary, state, git);
  }

  private showHandoffPanel(mode: HandoffMode, content: string): void {
    const panel = vscode.window.createWebviewPanel(
      'workstate.handoff',
      `${mode === 'quick' ? 'Quick' : 'Full'} Handoff`,
      vscode.ViewColumn.Active,
      { enableScripts: true }
    );
    let current = content;
    panel.webview.html = handoffHtml(nonce(), current, mode === 'quick' ? 'Quick' : 'Full');
    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'copy') {
        current = String(message.content ?? '');
        const active = getActive(this.store);
        if (active) {
          this.replaceState(recordHandoff(active, mode, current));
          await this.persist();
        }
        await this.copyToClipboard(current);
      }
      if (message.type === 'regenerate') {
        const active = getActive(this.store);
        if (!active) {
          return;
        }
        current = await this.buildContextHandoff(active, mode);
        panel.webview.html = handoffHtml(nonce(), current, mode === 'quick' ? 'Quick' : 'Full');
      }
    });
    if (!this.notificationSettings().enabled) {
      return;
    }
    void vscode.window.showInformationMessage('WorkState context is ready.', 'Copy Handoff', 'Open').then(async (choice) => {
      if (choice === 'Copy Handoff') {
        await this.copyToClipboard(current);
      }
      if (choice === 'Open') {
        panel.reveal(vscode.ViewColumn.Active);
      }
    });
  }

  private showEditPanel(state: WorkState): void {
    const panel = vscode.window.createWebviewPanel('workstate.edit', 'Edit WorkState', vscode.ViewColumn.Active, {
      enableScripts: true
    });
    panel.webview.html = editWorkStateHtml(nonce(), state);
    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.type !== 'save') {
        return;
      }
      const fields = parseEditableFields(message.fields);
      if (!fields.name || !fields.goal) {
        vscode.window.showWarningMessage('WorkState needs a task name and goal.');
        return;
      }
      const exclusions = this.exclusions();
      const safeFiles = filterExcludedPaths(fields.relevantFiles, exclusions);
      const blocked = fields.relevantFiles.filter((file) => isExcludedPath(file, exclusions));
      const active = getActive(this.store);
      if (!active) {
        vscode.window.showWarningMessage('No active WorkState to edit.');
        return;
      }
      this.replaceState(updateWorkState(active, { ...fields, relevantFiles: safeFiles }));
      await this.save('WorkState updated.');
      if (blocked.length > 0) {
        vscode.window.showWarningMessage(`Excluded sensitive-looking file paths: ${blocked.join(', ')}`);
      }
      panel.dispose();
    });
  }

  private showQuickUpdatePanel(variant: 'update' | 'capture'): void {
    const panel = vscode.window.createWebviewPanel(
      variant === 'capture' ? 'workstate.quickCapture' : 'workstate.quickUpdate',
      variant === 'capture' ? 'Quick Capture' : 'Quick Update',
      vscode.ViewColumn.Active,
      { enableScripts: true }
    );
    panel.webview.html = quickUpdateHtml(nonce(), variant);
    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.type !== 'save') {
        return;
      }
      const input = parseQuickUpdateInput(message.update);
      if (!input.content) {
        vscode.window.showWarningMessage(`${variant === 'capture' ? 'Quick Capture' : 'Quick Update'} needs content.`);
        return;
      }
      const active = getActive(this.store);
      if (!active) {
        vscode.window.showWarningMessage('No active WorkState to update.');
        return;
      }
      try {
        this.replaceState(applyQuickUpdate(active, input));
        await this.save(quickUpdateMessage(input.type));
        panel.dispose();
      } catch (error) {
        vscode.window.showWarningMessage(error instanceof Error ? error.message : String(error));
      }
    });
  }

  private async copyToClipboard(content: string): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(content);
      vscode.window.showInformationMessage('Handoff copied to clipboard.');
    } catch (error) {
      vscode.window.showErrorMessage(`Could not copy handoff: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleSidebarMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'ready':
        this.refresh();
        break;
      case 'create':
        await this.create();
        break;
      case 'continue':
        await this.createHandoff('quick');
        break;
      case 'edit':
        await this.editActive();
        break;
      case 'quickUpdate':
        await this.quickUpdate();
        break;
      case 'quickCapture':
        await this.quickCapture();
        break;
      case 'handoff':
        await this.createHandoff(message.mode === 'full' ? 'full' : 'quick');
        break;
      case 'decision':
        await this.manageDecisions();
        break;
      case 'rejected':
        await this.manageRejectedApproaches();
        break;
      case 'files':
        await this.manageRelevantFiles();
        break;
      case 'aboutGithub':
        await vscode.env.openExternal(vscode.Uri.parse('https://github.com/pranavv1210'));
        break;
      case 'dna':
        await this.viewTaskDna();
        break;
      case 'archive':
        await this.archiveActive();
        break;
      case 'fresh':
        this.restorationDismissed = true;
        this.refresh();
        break;
      case 'recover':
        this.loadError = undefined;
        this.store = { version: 1, states: [] };
        this.refresh();
        break;
    }
  }

  private async maybeShowWelcomeBack(): Promise<void> {
    const active = getActive(this.store);
    if (!active) {
      return;
    }
    const summary = summarizeContext(active, this.projectName());
    let memory = this.notificationMemory();
    if (!shouldShowWelcomeBack(summary, active.id, active.updatedAt, this.notificationSettings(), memory)) {
      return;
    }
    memory = rememberWelcomeBack(memory, active.id, active.updatedAt);
    await this.setNotificationMemory(memory);
    const choice = await vscode.window.showInformationMessage(
      `Welcome back. You were working on: ${summary.focus}. ${summary.summary}`,
      'Continue Work',
      'Dismiss'
    );
    if (choice === 'Continue Work') {
      await this.createHandoff('quick');
    }
  }

  private notificationSettings(): NotificationSettings {
    const config = vscode.workspace.getConfiguration('workstate.notifications');
    return {
      enabled: config.get<boolean>('enabled', true),
      welcomeBack: config.get<boolean>('welcomeBack', true),
      significantChanges: config.get<boolean>('significantChanges', true),
      branchChanges: config.get<boolean>('branchChanges', true)
    };
  }

  private notificationMemory(): NotificationMemory {
    return this.context.workspaceState.get<NotificationMemory>(this.notificationKey, defaultNotificationMemory);
  }

  private async setNotificationMemory(memory: NotificationMemory): Promise<void> {
    await this.context.workspaceState.update(this.notificationKey, memory);
  }

  private async manageDecisions(): Promise<void> {
    const active = this.activeOrNotify();
    if (!active) {
      return;
    }
    const pick = await vscode.window.showQuickPick(
      [
        { label: 'Add Decision', action: 'add', id: undefined },
        ...active.decisions.map((item) => ({ label: item.decision, description: item.reason, action: 'item', id: item.id }))
      ],
      { title: 'Manage Decisions' }
    );
    if (!pick) {
      return;
    }
    if (pick.action === 'item') {
      await this.manageDecisionItem(active, pick.id);
      return;
    }
    const decision = await vscode.window.showInputBox({ title: 'Decision', prompt: 'What decision should future sessions preserve?' });
    if (!decision?.trim()) {
      return;
    }
    const reason = await vscode.window.showInputBox({ title: 'Decision Reason', prompt: 'Optional reason' });
    this.replaceState(addDecision(active, decision, reason));
    await this.save('Decision recorded.');
  }

  private async manageDecisionItem(active: WorkState, id: string | undefined): Promise<void> {
    const item = active.decisions.find((decision) => decision.id === id);
    if (!item) {
      return;
    }
    const action = await vscode.window.showQuickPick(['Edit', 'Delete'], { title: item.decision });
    if (action === 'Delete') {
      const choice = await vscode.window.showWarningMessage(
        `Delete decision "${item.decision}"? This removes it from future handoffs but keeps existing Task DNA history.`,
        { modal: true },
        'Delete Decision'
      );
      if (choice === 'Delete Decision') {
        this.replaceState(deleteDecision(active, item.id));
        await this.save('Decision deleted.');
      }
      return;
    }
    if (action === 'Edit') {
      const decision = await vscode.window.showInputBox({ title: 'Edit Decision', value: item.decision, validateInput: required });
      if (!decision) {
        return;
      }
      const reason = await vscode.window.showInputBox({ title: 'Edit Decision Reason', value: item.reason ?? '' });
      this.replaceState(editDecision(active, item.id, decision, reason));
      await this.save('Decision edited.');
    }
  }

  private async manageRejectedApproaches(): Promise<void> {
    const active = this.activeOrNotify();
    if (!active) {
      return;
    }
    const pick = await vscode.window.showQuickPick(
      [
        { label: 'Add Rejected Approach', action: 'add', id: undefined },
        ...active.rejectedApproaches.map((item) => ({ label: item.approach, description: item.reason, action: 'item', id: item.id }))
      ],
      { title: "Manage Don't Repeat" }
    );
    if (!pick) {
      return;
    }
    if (pick.action === 'item') {
      await this.manageRejectedItem(active, pick.id);
      return;
    }
    const approach = await vscode.window.showInputBox({ title: "Don't Repeat", prompt: 'What approach should not be repeated?' });
    if (!approach?.trim()) {
      return;
    }
    const reason = await vscode.window.showInputBox({ title: 'Reason', prompt: 'Why should it not be repeated?' });
    if (!reason?.trim()) {
      vscode.window.showWarningMessage('Rejected approaches need a reason.');
      return;
    }
    this.replaceState(addRejectedApproach(active, approach, reason));
    await this.save('Rejected approach recorded.');
  }

  private async manageRejectedItem(active: WorkState, id: string | undefined): Promise<void> {
    const item = active.rejectedApproaches.find((rejected) => rejected.id === id);
    if (!item) {
      return;
    }
    const action = await vscode.window.showQuickPick(['Edit', 'Delete'], { title: item.approach });
    if (action === 'Delete') {
      const choice = await vscode.window.showWarningMessage(
        `Delete rejected approach "${item.approach}"? This removes it from future handoffs but keeps existing Task DNA history.`,
        { modal: true },
        'Delete Rejected Approach'
      );
      if (choice === 'Delete Rejected Approach') {
        this.replaceState(deleteRejectedApproach(active, item.id));
        await this.save('Rejected approach deleted.');
      }
      return;
    }
    if (action === 'Edit') {
      const approach = await vscode.window.showInputBox({ title: 'Edit Rejected Approach', value: item.approach, validateInput: required });
      if (!approach) {
        return;
      }
      const reason = await vscode.window.showInputBox({ title: 'Edit Reason', value: item.reason, validateInput: required });
      if (!reason) {
        return;
      }
      this.replaceState(editRejectedApproach(active, item.id, approach, reason));
      await this.save('Rejected approach edited.');
    }
  }

  private async manageRelevantFiles(): Promise<void> {
    const active = this.activeOrNotify();
    const root = this.workspaceRoot();
    if (!active || !root) {
      return;
    }
    const action = await vscode.window.showQuickPick(['Add Relevant Files', 'Remove Relevant Files'], {
      title: 'Manage Relevant Files'
    });
    if (action === 'Remove Relevant Files') {
      await this.removeRelevantFiles(active);
      return;
    }
    if (action !== 'Add Relevant Files') {
      return;
    }
    const files = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: true,
      defaultUri: vscode.Uri.file(root),
      title: 'Add Relevant Files'
    });
    if (!files?.length) {
      return;
    }
    const exclusions = this.exclusions();
    const relative = files.map((file) => path.relative(root, file.fsPath).replace(/\\/g, '/'));
    const safe = filterExcludedPaths(relative, exclusions);
    const blocked = relative.filter((file) => isExcludedPath(file, exclusions));
    const merged = [...new Set([...active.relevantFiles, ...safe])];
    this.replaceState(updateWorkState(active, { relevantFiles: merged }));
    await this.save('Relevant files updated.');
    if (blocked.length > 0) {
      vscode.window.showWarningMessage(`Excluded sensitive-looking files: ${blocked.join(', ')}`);
    }
  }

  private async removeRelevantFiles(active: WorkState): Promise<void> {
    if (active.relevantFiles.length === 0) {
      vscode.window.showInformationMessage('No relevant files recorded yet.');
      return;
    }
    const selected = await vscode.window.showQuickPick(
      active.relevantFiles.map((file) => ({ label: file })),
      { title: 'Remove Relevant Files', canPickMany: true, placeHolder: 'Select files to remove from this WorkState' }
    );
    if (!selected?.length) {
      return;
    }
    const remove = new Set(selected.map((item) => item.label));
    this.replaceState(updateWorkState(active, { relevantFiles: active.relevantFiles.filter((file) => !remove.has(file)) }));
    await this.save('Relevant files updated.');
  }
}

function parseEditableFields(raw: unknown) {
  const fields = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    name: stringValue(fields.name).trim(),
    goal: stringValue(fields.goal).trim(),
    currentState: stringValue(fields.currentState).trim(),
    completed: splitLines(stringValue(fields.completed)),
    blockers: splitLines(stringValue(fields.blockers)),
    relevantFiles: splitLines(stringValue(fields.relevantFiles)).map((file) => file.replace(/\\/g, '/')),
    testNotes: stringValue(fields.testNotes).trim(),
    nextAction: stringValue(fields.nextAction).trim()
  };
}

function parseQuickUpdateInput(raw: unknown): QuickUpdateInput {
  const fields = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    type: parseQuickUpdateType(fields.type),
    content: stringValue(fields.content).trim(),
    reason: stringValue(fields.reason).trim(),
    blockerMode: fields.blockerMode === 'replace' ? 'replace' : 'add'
  };
}

function parseQuickUpdateType(value: unknown): QuickUpdateInput['type'] {
  const allowed: QuickUpdateInput['type'][] = [
    'completed',
    'currentState',
    'blocker',
    'decision',
    'rejected',
    'testResult',
    'nextAction',
    'note'
  ];
  return typeof value === 'string' && allowed.includes(value as QuickUpdateInput['type'])
    ? (value as QuickUpdateInput['type'])
    : 'note';
}

function quickUpdateMessage(type: QuickUpdateInput['type']): string {
  switch (type) {
    case 'completed':
      return 'Completed work recorded.';
    case 'currentState':
      return 'Current State updated.';
    case 'blocker':
      return 'Blocker recorded.';
    case 'decision':
      return 'Decision recorded.';
    case 'rejected':
      return 'Rejected approach recorded.';
    case 'testResult':
      return 'Test Result recorded.';
    case 'nextAction':
      return 'Next Action updated.';
    case 'note':
      return 'Note captured.';
  }
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function splitLines(value: string | undefined): string[] {
  return (value ?? '')
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function required(value: string): string | undefined {
  return value.trim() ? undefined : 'Required.';
}

function nonce(): string {
  return Math.random().toString(36).slice(2);
}
