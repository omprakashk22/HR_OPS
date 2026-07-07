import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import EmployeeFormPage from '../src/pages/EmployeeFormPage';
import { renderWithProviders, fakeResponse } from './test-utils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function renderCreate() {
  return renderWithProviders(
    <Routes>
      <Route path="/employees/new" element={<EmployeeFormPage />} />
      <Route path="/employees/:id" element={<div>Employee detail</div>} />
    </Routes>,
    { route: '/employees/new' },
  );
}

describe('EmployeeFormPage (create)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    mockFetch.mockResolvedValue(fakeResponse(201, { id: '99', salaryHistory: [] }));
  });

  it('shows validation errors and does not submit when required fields are empty', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: /create employee/i }));

    expect(await screen.findAllByText(/required/i)).not.toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('creates an employee when the form is valid', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText(/first name/i), 'Grace');
    await user.type(screen.getByLabelText(/last name/i), 'Hopper');
    await user.type(screen.getByLabelText(/job title/i), 'Principal, Engineering');
    fireEvent.change(screen.getByLabelText(/^hire date$/i), { target: { value: '2019-06-01' } });
    await user.type(screen.getByLabelText(/base salary/i), '190000');
    fireEvent.change(screen.getByLabelText(/effective date/i), { target: { value: '2019-06-01' } });

    await user.click(screen.getByRole('button', { name: /create employee/i }));

    await waitFor(() => {
      const posted = mockFetch.mock.calls.some(
        ([url, opts]) => String(url).endsWith('/employees') && (opts as RequestInit)?.method === 'POST',
      );
      expect(posted).toBe(true);
    });
  });
});
