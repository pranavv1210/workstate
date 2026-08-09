import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GitContext } from '../domain/model';
import { filterExcludedPaths } from '../domain/privacy';

const execFileAsync = promisify(execFile);

export async function getGitContext(workspaceRoot: string, exclusions: string[]): Promise<GitContext> {
  try {
    const [branch, status, log] = await Promise.all([
      runGit(workspaceRoot, ['branch', '--show-current']),
      runGit(workspaceRoot, ['status', '--short']),
      runGit(workspaceRoot, ['log', '--oneline', '-5'])
    ]);
    const changedFiles = status
      .split(/\r?\n/)
      .map((line) => line.slice(3).trim())
      .filter(Boolean);
    return {
      branch: branch.trim() || undefined,
      changedFiles: filterExcludedPaths(changedFiles, exclusions),
      recentCommits: log.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    };
  } catch (error) {
    return { changedFiles: [], recentCommits: [], unavailableReason: error instanceof Error ? error.message : 'Git unavailable.' };
  }
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  const result = await execFileAsync('git', args, { cwd, timeout: 3000 });
  return result.stdout;
}
