import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeesPage from '../src/pages/EmployeesPage';
import { renderWithProviders, fakeResponse } from './test-utils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const listResponse = {
  data: [
    {
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
      currentSalary: { base: '100000', bonus: '0', currency: 'GBP', annualUsd: '127000.00' },
    },
  ],
  page: 1,
  pageSize: 25,
  total: 1,
};

describe('EmployeesPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(fakeResponse(200, listResponse));
    localStorage.clear();
  });

  it('renders employees with their USD current salary', async () => {
    renderWithProviders(<EmployeesPage />);
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('$127,000.00')).toBeInTheDocument();
  });

  it('refetches with the search param when the user searches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeesPage />);
    await screen.findByText('Ada Lovelace');

    await user.type(screen.getByLabelText(/search employees/i), 'grace');

    await waitFor(() => {
      const searched = mockFetch.mock.calls.some(([url]) => String(url).includes('search=grace'));
      expect(searched).toBe(true);
    });
  });

  it('refetches with the country filter applied', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeesPage />);
    await screen.findByText('Ada Lovelace');

    await user.selectOptions(screen.getByLabelText(/filter by country/i), 'US');

    await waitFor(() => {
      const filtered = mockFetch.mock.calls.some(([url]) => String(url).includes('country=US'));
      expect(filtered).toBe(true);
    });
  });
});
