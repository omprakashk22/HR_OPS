import { describe, it, expect } from 'vitest';
import { parseListQuery } from '../../src/shared/pagination';

describe('parseListQuery', () => {
  it('applies defaults for an empty query', () => {
    expect(parseListQuery({})).toMatchObject({
      page: 1,
      pageSize: 25,
      sortBy: 'employeeNumber',
      sortDir: 'asc',
    });
  });

  it('clamps page to >= 1 and pageSize to <= 100', () => {
    expect(parseListQuery({ page: '-3', pageSize: '9999' })).toMatchObject({
      page: 1,
      pageSize: 100,
    });
  });

  it('whitelists sortBy and sortDir against injection', () => {
    expect(parseListQuery({ sortBy: 'DROP TABLE', sortDir: 'x' })).toMatchObject({
      sortBy: 'employeeNumber',
      sortDir: 'asc',
    });
  });

  it('passes through known filters and honors a valid sort', () => {
    expect(parseListQuery({ country: 'IN', sortBy: 'lastName', sortDir: 'desc', search: ' Rao ' })).toMatchObject({
      country: 'IN',
      sortBy: 'lastName',
      sortDir: 'desc',
      search: 'Rao',
    });
  });

  it('ignores blank and unknown filters', () => {
    const q = parseListQuery({ country: '   ', bogus: 'nope' });
    expect(q.country).toBeUndefined();
    expect((q as Record<string, unknown>).bogus).toBeUndefined();
  });
});
