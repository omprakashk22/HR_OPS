import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApprovalsInboxPage from '../src/pages/ApprovalsInboxPage';
import { renderWithProviders, fakeResponse } from './test-utils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const pendingRequest = {
  id: 'req1',
  entityType: 'Reimbursement',
  entityId: 'r1',
  context: { amountUsd: '1500.00', currency: 'GBP', category: 'Travel' },
  status: 'PENDING',
  currentSequence: 1,
  submittedBy: 'u2',
  createdAt: '2024-01-01T00:00:00Z',
  actions: [],
  workflow: {
    id: 'w1', name: 'WF', entityType: 'Reimbursement', isActive: true, onReject: 'TERMINATE',
    levels: [{ sequence: 1, name: 'Manager', approverType: 'ROLE', approverRole: 'MANAGER', condition: null }],
  },
};

describe('ApprovalsInboxPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      const u = String(url);
      const method = opts?.method ?? 'GET';
      if (u.includes('/requests/req1/decision') && method === 'POST') {
        return Promise.resolve(fakeResponse(200, { ...pendingRequest, status: 'APPROVED', currentSequence: 0 }));
      }
      if (u.includes('/requests/req1')) return Promise.resolve(fakeResponse(200, pendingRequest));
      if (u.includes('/approvals/requests')) return Promise.resolve(fakeResponse(200, { data: [pendingRequest] }));
      return Promise.resolve(fakeResponse(404, { error: 'not found' }));
    });
  });

  it('lists an actionable request and approving it posts a decision', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ApprovalsInboxPage />);

    const row = await screen.findByRole('button', { name: /Reimbursement/i });
    await user.click(row);

    const approve = await screen.findByRole('button', { name: /^approve$/i });
    await user.click(approve);

    await waitFor(() => {
      const posted = mockFetch.mock.calls.some(
        ([url, opts]) => String(url).includes('/requests/req1/decision') && (opts as RequestInit)?.method === 'POST',
      );
      expect(posted).toBe(true);
    });
  });
});
