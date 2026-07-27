import type { AuthRole } from '../types/auth.type.js';
import type {
  SearchImageResponseItem,
  SearchImageResultItem,
} from '../types/search.type.js';

export function formatSearchResultsForRole(
  results: SearchImageResultItem[],
  role: AuthRole,
): SearchImageResponseItem[] {
  if (role === 'ADMIN') {
    return results;
  }

  return results.map(({ similarityScore: _similarityScore, ...result }) => result);
}
