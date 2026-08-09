import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { WorkStateStore, emptyStore, validateStore } from '../domain/model';

export class WorkStateRepository {
  private readonly filePath: string;

  constructor(private readonly workspaceRoot: string) {
    this.filePath = path.join(workspaceRoot, '.workstate', 'workstate.json');
  }

  get path(): string {
    return this.filePath;
  }

  async load(): Promise<WorkStateStore> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      return validateStore(JSON.parse(raw));
    } catch (error) {
      if (isNotFound(error)) {
        return emptyStore();
      }
      await this.backupCorruptedFile();
      throw new Error(`WorkState state could not be loaded. A backup was created. ${message(error)}`);
    }
  }

  async save(store: WorkStateStore): Promise<void> {
    const folder = path.dirname(this.filePath);
    await fs.mkdir(folder, { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    const payload = `${JSON.stringify(store, null, 2)}\n`;
    await fs.writeFile(tempPath, payload, 'utf8');
    await fs.rename(tempPath, this.filePath);
  }

  private async backupCorruptedFile(): Promise<void> {
    try {
      const backupPath = `${this.filePath}.corrupt-${Date.now()}.bak`;
      await fs.copyFile(this.filePath, backupPath);
    } catch {
      // Best-effort recovery path. The original load error is more useful to surface.
    }
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

