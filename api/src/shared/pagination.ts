/** Columns the employee list is allowed to sort by (allow-list vs injection). */
export const SORT_COLUMNS = [
  'employeeNumber',
  'firstName',
  'lastName',
  'country',
  'department',
  'level',
  'hireDate',
] as const;

export type SortColumn = (typeof SORT_COLUMNS)[number];

const FILTER_KEYS = ['search', 'country', 'department', 'level', 'status'] as const;

export interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  country?: string;
  department?: string;
  level?: string;
  status?: string;
  sortBy: SortColumn;
  sortDir: 'asc' | 'desc';
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/**
 * Parse and sanitize an employee-list query string. Clamps pagination,
 * whitelists sort column/direction, trims and drops blank/unknown filters.
 */
export function parseListQuery(q: Record<string, unknown>): ListQuery {
  const page = Math.max(1, toInt(q.page, 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, toInt(q.pageSize, DEFAULT_PAGE_SIZE)));
  const sortBy: SortColumn = SORT_COLUMNS.includes(q.sortBy as SortColumn)
    ? (q.sortBy as SortColumn)
    : 'employeeNumber';
  const sortDir: 'asc' | 'desc' = q.sortDir === 'desc' ? 'desc' : 'asc';

  const result: ListQuery = { page, pageSize, sortBy, sortDir };
  for (const key of FILTER_KEYS) {
    const value = q[key];
    if (typeof value === 'string' && value.trim() !== '') {
      result[key] = value.trim();
    }
  }
  return result;
}
