import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as {
  author: { name: string; url: string };
  description: string;
  icon: string;
  keywords: string[];
  contributes: {
    commands: Array<{ command: string; title: string }>;
    keybindings: Array<{ command: string; key: string; mac?: string; when?: string }>;
    configuration: { properties: Record<string, unknown> };
  };
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
    expect(manifest.description).toBe('Preserve engineering context across AI coding sessions in VS Code.');
    expect(manifest.author).toEqual({
      name: 'Pranav',
      url: 'https://github.com/pranavv1210'
    });
    expect(manifest.icon).toBe('media/workstate.png');
    expect(manifest.keywords).toEqual(expect.arrayContaining(['ai-coding', 'coding-agents', 'codex', 'claude', 'copilot', 'gemini']));
    expect(manifest.contributes.configuration.properties).toHaveProperty('workstate.notifications.enabled');
    expect(manifest.contributes.configuration.properties).toHaveProperty('workstate.notifications.welcomeBack');
    expect(manifest.contributes.configuration.properties).toHaveProperty('workstate.notifications.significantChanges');
    expect(manifest.contributes.configuration.properties).toHaveProperty('workstate.notifications.branchChanges');
  });
});
