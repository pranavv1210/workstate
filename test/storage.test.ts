import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createWorkState, emptyStore } from '../src/domain/model';
import { WorkStateRepository } from '../src/storage/workStateRepository';

describe('WorkStateRepository', () => {
  it('saves and restores human-readable local state', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'workstate-'));
    const repo = new WorkStateRepository(dir);
    const state = createWorkState({ name: 'Task', goal: 'Goal' });
    await repo.save({ ...emptyStore(), activeId: state.id, states: [state] });

    const raw = await fs.readFile(repo.path, 'utf8');
    expect(raw).toContain('"version": 1');

    const loaded = await repo.load();
    expect(loaded.states[0]?.name).toBe('Task');
  });

  it('backs up corrupted state and returns a readable error', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'workstate-'));
    const repo = new WorkStateRepository(dir);
    await fs.mkdir(path.dirname(repo.path), { recursive: true });
    await fs.writeFile(repo.path, '{ bad json', 'utf8');

    await expect(repo.load()).rejects.toThrow('could not be loaded');
    const files = await fs.readdir(path.dirname(repo.path));
    expect(files.some((file) => file.includes('.corrupt-'))).toBe(true);
  });
});

