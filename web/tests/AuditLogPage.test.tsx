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
  actor: { id: 'd063646c', name: 'ACME HR Manager', email: 'hr@acme.test' },
  label: 'E00001 · Ada Lovelace',
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

  it('renders audit entries with meaningful record + actor labels', async () => {
    renderWithProviders(<AuditLogPage />);
    expect(await screen.findByText('UPDATE')).toBeInTheDocument();
    expect(screen.getByText('E00001 · Ada Lovelace')).toBeInTheDocument(); // record label, not id
    expect(screen.getByText('ACME HR Manager')).toBeInTheDocument(); // actor name, not id
  });

  it('opens a red/green diff when a row is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditLogPage />);
    await user.click(await screen.findByText('E00001 · Ada Lovelace'));
    const dialog = await screen.findByRole('dialog');
    // Old (Engineering) and new (Product) values both shown in the comparison.
    expect(dialog).toHaveTextContent('Engineering');
    expect(dialog).toHaveTextContent('Product');
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
