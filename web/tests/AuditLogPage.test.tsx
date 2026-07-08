import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuditLogPage from '../src/pages/AuditLogPage';
import { renderWithProviders, fakeResponse } from './test-utils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const entry = {
  id: 'a1',
  model: 'Employee',
  recordId: '9b0fd322-4864-4924-a57c-3890921ffc41',
  action: 'UPDATE',
  actorUserId: 'd063646c-69e5-4add-9ee4-ff7c3c6543ff',
  before: { department: 'Engineering' },
  after: { department: 'Product' },
  createdAt: '2026-07-08T09:00:00Z',
};

describe('AuditLogPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    mockFetch.mockImplementation(() =>
      Promise.resolve(fakeResponse(200, { data: [entry], page: 1, pageSize: 50, total: 1 })),
    );
  });

  it('renders audit entries', async () => {
    renderWithProviders(<AuditLogPage />);
    // 'UPDATE' and the truncated record id are unique to the table row.
    expect(await screen.findByText('UPDATE')).toBeInTheDocument();
    expect(screen.getByText('9b0fd322…')).toBeInTheDocument();
  });

  it('refetches with a table filter', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditLogPage />);
    await screen.findByText('Employee');

    await user.selectOptions(screen.getByLabelText(/filter by table/i), 'Reimbursement');
    await waitFor(() => {
      const filtered = mockFetch.mock.calls.some(([url]) => String(url).includes('model=Reimbursement'));
      expect(filtered).toBe(true);
    });
  });
});
