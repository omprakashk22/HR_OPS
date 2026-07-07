import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { renderWithProviders, fakeResponse } from './test-utils';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const HR_USER = { id: '1', email: 'hr@acme.test', name: 'ACME HR Manager', role: 'HR_MANAGER' };

describe('LoginPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  it('logs in with valid credentials, stores the token, and enters the app', async () => {
    mockFetch.mockResolvedValueOnce(fakeResponse(200, { token: 'jwt-token', user: HR_USER }));
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: '/login' });

    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(localStorage.getItem('salary_token')).toBe('jwt-token'));
    expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
  });

  it('shows an error message on invalid credentials', async () => {
    mockFetch.mockResolvedValueOnce(fakeResponse(401, { error: 'Invalid email or password' }));
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: '/login' });

    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
    expect(localStorage.getItem('salary_token')).toBeNull();
  });
});
