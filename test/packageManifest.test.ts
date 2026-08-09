import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as {
  author: { name: string; url: string };
  description: string;
  icon: string;
  keywords: string[];
  name: string;
  displayName: string;
  publisher: string;
  repository: { type: string; url: string };
  license: string;
  version: string;
  contributes: {
    viewsContainers: {
      activitybar: Array<{ id: string; title: string; icon: string }>;
    };
    commands: Array<{ command: string; title: string }>;
    keybindings: Array<{ command: string; key: string; mac?: string; when?: string }>;
    chatParticipants: Array<{ id: string; name: string; fullName: string; commands: Array<{ name: string; description: string }> }>;
    languageModelTools: Array<{ name: string; canBeReferencedInPrompt: boolean; when: string; inputSchema: unknown }>;
    configuration: { properties: Record<string, unknown> };
  };
  activationEvents: string[];
};

describe('package manifest', () => {
  it('contributes exactly one Quick Capture command and keyboard shortcut', () => {
    const quickCaptureCommands = manifest.contributes.commands.filter((item) => item.command === 'workstate.quickCapture');
    const quickCaptureKeybindings = manifest.contributes.keybindings.filter((item) => item.command === 'workstate.quickCapture');

    expect(quickCaptureCommands).toHaveLength(1);
    expect(quickCaptureCommands[0]?.title).toBe('WorkState: Quick Capture');
    expect(quickCaptureKeybindings).toEqual([
      {
        command: 'workstate.quickCapture',
        key: 'ctrl+alt+w',
        mac: 'cmd+alt+w',
        when: 'workspaceFolderCount != 0'
      }
    ]);
  });

  it('keeps task-management wording out of the primary create command', () => {
    const create = manifest.contributes.commands.find((item) => item.command === 'workstate.createWorkState');

    expect(create?.title).toBe('WorkState: Start Remembering');
  });

  it('includes creator metadata and notification settings', () => {
    expect(manifest.name).toBe('workstate');
    expect(manifest.displayName).toBe('WorkState');
    expect(manifest.publisher).toBe('pranavv1210');
    expect(manifest.version).toBe('0.2.3');
    expect(manifest.description).toBe('Preserve engineering context across AI coding sessions in VS Code.');
    expect(manifest.repository).toEqual({
      type: 'git',
      url: 'https://github.com/pranavv1210/workstate.git'
    });
    expect(manifest.license).toBe('MIT');
    expect(manifest.author).toEqual({
      name: 'Pranav',
      url: 'https://github.com/pranavv1210'
    });
    expect(manifest.icon).toBe('media/workstate.png');
    expect(manifest.contributes.viewsContainers.activitybar).toContainEqual({
      id: 'workstate',
      title: 'WorkState',
      icon: 'media/workstate-activity.svg'
    });
    expect(manifest.keywords).toEqual(expect.arrayContaining(['ai-coding', 'coding-agents', 'codex', 'claude', 'copilot', 'gemini']));
    expect(manifest.contributes.configuration.properties).toHaveProperty('workstate.notifications.enabled');
    expect(manifest.contributes.configuration.properties).toHaveProperty('workstate.notifications.welcomeBack');
    expect(manifest.contributes.configuration.properties).toHaveProperty('workstate.notifications.significantChanges');
    expect(manifest.contributes.configuration.properties).toHaveProperty('workstate.notifications.branchChanges');
    expect(manifest.contributes.configuration.properties).toHaveProperty('workstate.contextCapture.mode');
  });

  it('contributes context switching commands without changing Marketplace identity', () => {
    const commands = manifest.contributes.commands.map((item) => item.command);

    expect(commands).toEqual(expect.arrayContaining(['workstate.continueWork', 'workstate.reviewContext', 'workstate.providerStatus']));
  });

  it('contributes WorkState AI tools and chat participant through stable VS Code extension points', () => {
    const toolNames = manifest.contributes.languageModelTools.map((tool) => tool.name);

    expect(toolNames).toEqual([
      'workstate_get_context',
      'workstate_get_resume_state',
      'workstate_update_context',
      'workstate_save_decision',
      'workstate_reconcile',
      'workstate_get_handoff'
    ]);
    expect(manifest.contributes.languageModelTools.every((tool) => tool.canBeReferencedInPrompt)).toBe(true);
    expect(manifest.contributes.languageModelTools.every((tool) => tool.when === 'workspaceFolderCount != 0')).toBe(true);
    expect(manifest.contributes.chatParticipants).toEqual([
      expect.objectContaining({
        id: 'workstate.chat',
        name: 'workstate',
        fullName: 'WorkState'
      })
    ]);
    expect(manifest.contributes.chatParticipants[0]?.commands.map((command) => command.name)).toEqual([
      'resume',
      'handoff',
      'reconcile',
      'decision'
    ]);
    expect(manifest.activationEvents).toEqual(
      expect.arrayContaining([
        'onChatParticipant:workstate.chat',
        'onLanguageModelTool:workstate_get_context',
        'onLanguageModelTool:workstate_get_resume_state',
        'onLanguageModelTool:workstate_update_context',
        'onLanguageModelTool:workstate_save_decision',
        'onLanguageModelTool:workstate_reconcile',
        'onLanguageModelTool:workstate_get_handoff'
      ])
    );
  });
});
