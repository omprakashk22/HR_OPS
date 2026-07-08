import { ReactNode } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import DashboardPage from './pages/DashboardPage';
import ReimbursementsPage from './pages/ReimbursementsPage';
import ApprovalsInboxPage from './pages/ApprovalsInboxPage';
import WorkflowConfigPage from './pages/WorkflowConfigPage';
import AuditLogPage from './pages/AuditLogPage';
import { CONFIG_ROLES } from './lib/constants';

function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold text-slate-900">
              ACME Salary
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link to="/" className="hover:text-slate-900">
                Dashboard
              </Link>
              <Link to="/employees" className="hover:text-slate-900">
                Employees
              </Link>
              <Link to="/reimbursements" className="hover:text-slate-900">
                Reimbursements
              </Link>
              <Link to="/approvals" className="hover:text-slate-900">
                Approvals
              </Link>
              {user && CONFIG_ROLES.includes(user.role) && (
                <Link to="/approvals/workflows" className="hover:text-slate-900">
                  Workflows
                </Link>
              )}
              {user && user.role === 'ADMIN' && (
                <Link to="/audit" className="hover:text-slate-900">
                  Audit
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{user?.name}</span>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-slate-600 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="employees/new" element={<EmployeeFormPage />} />
                <Route path="employees/:id" element={<EmployeeDetailPage />} />
                <Route path="employees/:id/edit" element={<EmployeeFormPage />} />
                <Route path="reimbursements" element={<ReimbursementsPage />} />
                <Route path="approvals" element={<ApprovalsInboxPage />} />
                <Route path="approvals/workflows" element={<WorkflowConfigPage />} />
                <Route path="audit" element={<AuditLogPage />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
