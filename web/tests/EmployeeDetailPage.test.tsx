import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import EmployeeDetailPage from '../src/pages/EmployeeDetailPage';
import { renderWithProviders, fakeResponse } from './test-utils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const detail = {
  id: '1',
  employeeNumber: 'E00001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  gender: 'FEMALE',
  country: 'GB',
  department: 'Engineering',
  jobTitle: 'Staff, Engineering',
  level: 'L4_STAFF',
  localCurrency: 'GBP',
  hireDate: '2020-03-01',
  status: 'ACTIVE',
  salaryHistory: [
    { id: 's1', reason: 'Initial hire', baseSalary: '100000', bonus: '0', currency: 'GBP', effectiveDate: '2020-03-01', annualUsd: '127000.00' },
    { id: 's2', reason: 'Annual raise', baseSalary: '110000', bonus: '0', currency: 'GBP', effectiveDate: '2022-01-01', annualUsd: '139700.00' },
  ],
};

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/employees/:id" element={<EmployeeDetailPage />} />
    </Routes>,
    { route: '/employees/1' },
  );
}

describe('EmployeeDetailPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      const u = String(url);
      const method = options?.method ?? 'GET';
      if (u.includes('/employees/1/salary') && method === 'POST') {
        return Promise.resolve(fakeResponse(201, detail));
      }
      if (u.includes('/employees/1')) return Promise.resolve(fakeResponse(200, detail));
      return Promise.resolve(fakeResponse(404, { error: 'not found' }));
    });
  });

  it('renders the profile and salary history newest-first', async () => {
    renderDetail();
    expect(await screen.findByRole('heading', { name: /Ada Lovelace/i })).toBeInTheDocument();
    expect(screen.getByText('Initial hire')).toBeInTheDocument();
    expect(screen.getByText('Annual raise')).toBeInTheDocument();
  });

  it('validates the adjust-salary form, then submits a valid change', async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByRole('heading', { name: /Ada Lovelace/i });

    await user.click(screen.getByRole('button', { name: /adjust salary/i }));
    const dialog = await screen.findByRole('dialog');

    // Empty base salary → validation error, no POST.
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }));
    expect(await within(dialog).findByText(/valid amount/i)).toBeInTheDocument();

    // Fill valid values → POST fires.
    await user.type(within(dialog).getByLabelText(/base salary/i), '130000');
    fireEvent.change(within(dialog).getByLabelText(/effective date/i), {
      target: { value: '2023-01-01' },
    });
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const posted = mockFetch.mock.calls.some(
        ([url, opts]) => String(url).includes('/employees/1/salary') && (opts as RequestInit)?.method === 'POST',
      );
      expect(posted).toBe(true);
    });
  });
});
