import { ContextMemory, ContextMemoryType, ContextSource, makeId, nowIso } from '../domain/model';

export interface ExtractionOptions {
  source?: ContextSource;
  timestamp?: string;
  agentId?: string;
}

interface Rule {
  type: ContextMemoryType;
  confidence: ContextMemory['confidence'];
  patterns: RegExp[];
}

const rules: Rule[] = [
  {
    type: 'completed',
    confidence: 'confirmed',
    patterns: [
      /\b(?:implemented|fixed|completed|finished|added|updated)\s+(.+?)(?:\.|$)/i,
      /\b(?:done|resolved):\s*(.+?)(?:\.|$)/i
    ]
  },
  {
    type: 'decision',
    confidence: 'confirmed',
    patterns: [
      /\b(?:decided|decision):?\s*(?:to\s+)?(.+?)(?:\.|$)/i,
      /\bwe will\s+(.+?)(?:\.|$)/i
    ]
  },
  {
    type: 'rejected',
    confidence: 'confirmed',
    patterns: [
      /\b(?:do not|don't)\s+(.+?)(?:because|as|since|\.|$)/i,
      /\b(?:rejected|avoid):?\s*(.+?)(?:\.|$)/i
    ]
  },
  {
    type: 'blocker',
    confidence: 'confirmed',
    patterns: [
      /\b(?:blocked|blocker):?\s*(?:because\s*)?(.+?)(?:\.|$)/i,
      /\bfailing because\s+(.+?)(?:\.|$)/i
    ]
  },
  {
    type: 'testResult',
    confidence: 'confirmed',
    patterns: [
      /\b((?:tests?|analyze|lint|compile)\s+(?:pass|passed|passing|fails|failed|failing).*?)(?:\.|$)/i,
      /\b(?:tests?|analyze|lint|compile)\s+(?:pass|passed|passing|fails|failed|failing)(.*?)(?:\.|$)/i,
      /\b(\d+\s+passing\b.*?)(?:\.|$)/i
    ]
  },
  {
    type: 'nextAction',
    confidence: 'suggested',
    patterns: [
      /\bnext:?\s*(.+?)(?:\.|$)/i,
      /\b(?:next step|todo|follow up):?\s*(.+?)(?:\.|$)/i
    ]
  }
];

export function extractContextMemories(text: string, options: ExtractionOptions = {}): ContextMemory[] {
  const source = options.source ?? 'deterministic-extraction';
  const timestamp = options.timestamp ?? nowIso();
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [];
  }

  const results: ContextMemory[] = [];
  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      const match = pattern.exec(normalized);
      const content = clean(match?.[1]);
      if (!content) {
        continue;
      }
      results.push({
        id: makeId('memory'),
        type: rule.type,
        content,
        confidence: rule.confidence,
        source,
        timestamp,
        agentId: options.agentId,
        evidence: normalized
      });
      break;
    }
  }
  return dedupe(results);
}

function clean(value: string | undefined): string {
  return (value ?? '')
    .replace(/^(to|that)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupe(items: ContextMemory[]): ContextMemory[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.content.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
