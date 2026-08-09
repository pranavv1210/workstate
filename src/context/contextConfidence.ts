import { ContextConfidence } from '../domain/model';

export function confidenceRank(value: ContextConfidence): number {
  switch (value) {
    case 'confirmed':
      return 4;
    case 'suggested':
      return 3;
    case 'needs_review':
      return 2;
    case 'rejected':
      return 1;
  }
}

export function isReviewable(value: ContextConfidence): boolean {
  return value === 'suggested' || value === 'needs_review';
}
