import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReimbursementsPage from '../src/pages/ReimbursementsPage';
import { renderWithProviders, fakeResponse } from './test-utils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ReimbursementsPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      const u = String(url);
      const method = opts?.method ?? 'GET';
      if (u.includes('/reimbursements') && method === 'POST') {
        return Promise.resolve(
          fakeResponse(201, {
            id: 'r1', employeeId: 'e1', amount: '200.00', currency: 'USD',
            category: 'Meals', note: 'Team lunch', status: 'PENDING', submittedBy: 'u1', createdAt: '2024-01-01T00:00:00Z',
          }),
        );
      }
      if (u.includes('/reimbursements')) return Promise.resolve(fakeResponse(200, { data: [] }));
      return Promise.resolve(fakeResponse(404, { error: 'not found' }));
    });
  });

  it('submits a self-filed claim (no employee picker for a non-privileged user)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReimbursementsPage />);

    // Non-privileged → no employee picker.
    expect(screen.queryByLabelText(/search employee/i)).toBeNull();

    await user.type(screen.getByLabelText(/amount/i), '200');
    await user.type(screen.getByLabelText(/note/i), 'Team lunch');
    await user.click(screen.getByRole('button', { name: /submit claim/i }));

    await waitFor(() => {
      const posted = mockFetch.mock.calls.some(
        ([url, opts]) => String(url).includes('/reimbursements') && (opts as RequestInit)?.method === 'POST',
      );
      expect(posted).toBe(true);
    });
  });
});
