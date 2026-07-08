import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkflowConfigPage from '../src/pages/WorkflowConfigPage';
import { renderWithProviders, fakeResponse } from './test-utils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('WorkflowConfigPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      const u = String(url);
      const method = opts?.method ?? 'GET';
      if (u.includes('/approvals/workflows') && method === 'POST') {
        return Promise.resolve(fakeResponse(201, { id: 'w1' }));
      }
      if (u.includes('/approvals/workflows')) return Promise.resolve(fakeResponse(200, { data: [] }));
      return Promise.resolve(fakeResponse(404, { error: 'not found' }));
    });
  });

  it('builds a 2-level workflow and posts it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowConfigPage />);

    await user.click(await screen.findByRole('button', { name: /new workflow/i }));
    await user.type(screen.getByLabelText(/^name$/i), 'Reimbursement approval');
    await user.click(screen.getByRole('button', { name: /add level/i }));
    await user.click(screen.getByRole('button', { name: /add level/i }));
    await user.click(screen.getByRole('button', { name: /save workflow/i }));

    await waitFor(() => {
      const post = mockFetch.mock.calls.find(
        ([url, opts]) => String(url).includes('/approvals/workflows') && (opts as RequestInit)?.method === 'POST',
      );
      expect(post).toBeTruthy();
      const body = JSON.parse((post![1] as RequestInit).body as string);
      expect(body.levels).toHaveLength(2);
      expect(body.name).toBe('Reimbursement approval');
    });
  });
});
