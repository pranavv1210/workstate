const defaultExclusions = [
  '.env',
  '.env.*',
  '**/.env',
  '**/.env.*',
  '**/*secret*',
  '**/*credential*',
  '**/credentials.json',
  '**/service-account.json',
  '**/*token*',
  '**/secret.txt',
  '**/token.txt',
  '**/*.pem',
  '**/*.key',
  '**/id_rsa',
  '**/id_ed25519'
];

export function getDefaultExclusions(): string[] {
  return [...defaultExclusions];
}

export function isExcludedPath(path: string, exclusions = defaultExclusions): boolean {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  return exclusions.some((pattern) => matchesPattern(normalized, pattern.toLowerCase().replace(/\\/g, '/')));
}

function matchesPattern(path: string, pattern: string): boolean {
  if (pattern.startsWith('**/') && matchesPattern(path, pattern.slice(3))) {
    return true;
  }
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  const regex = new RegExp(`(^|/)${escaped}$`);
  return regex.test(path) || path === pattern;
}

export function filterExcludedPaths(paths: string[], exclusions = defaultExclusions): string[] {
  return paths.filter((path) => !isExcludedPath(path, exclusions));
}
