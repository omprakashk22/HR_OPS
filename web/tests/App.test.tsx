import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import App from '../src/App';
import { renderWithProviders } from './test-utils';

describe('App', () => {
  beforeEach(() => localStorage.clear());

  it('shows the login page for an unauthenticated visitor', () => {
    renderWithProviders(<App />, { route: '/login' });
    expect(screen.getByRole('heading', { name: /ACME Salary Management/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor away from a protected route', () => {
    renderWithProviders(<App />, { route: '/' });
    // No token → ProtectedRoute redirects to /login, which renders the form.
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
