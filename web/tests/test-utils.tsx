import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/auth/AuthContext';

/** Render a component inside Query + Router + Auth providers, at a given route. */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Build a minimal fetch Response stand-in for stubbing global fetch. */
export function fakeResponse(status: number, body: unknown) {
  return {
    ok: status < 400,
    status,
    statusText: '',
    json: async () => body,
  } as Response;
}
