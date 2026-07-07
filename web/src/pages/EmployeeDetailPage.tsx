import { useState, ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getEmployee, deleteEmployee } from '../api/employees';
import { SalaryHistoryTimeline } from '../components/SalaryHistoryTimeline';
import { SalaryAdjustForm } from '../components/SalaryAdjustForm';
import { Dialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { formatMoney } from '../lib/formatMoney';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [adjustOpen, setAdjustOpen] = useState(false);

  const {
    data: employee,
    isLoading,
    isError,
  } = useQuery({ queryKey: ['employee', id], queryFn: () => getEmployee(id) });

  const terminate = useMutation({
    mutationFn: () => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate('/employees');
    },
  });

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (isError || !employee) return <p className="text-red-600">Employee not found.</p>;

  const latest = employee.salaryHistory[employee.salaryHistory.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/employees" className="text-sm text-slate-500 hover:underline">
            ← Employees
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-sm text-slate-500">
            {employee.employeeNumber} · {employee.jobTitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/employees/${id}/edit`)}>
            Edit
          </Button>
          <Button onClick={() => setAdjustOpen(true)}>Adjust salary</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm('Mark this employee as terminated?')) terminate.mutate();
            }}
          >
            Terminate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="Status">
              <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'muted'}>
                {employee.status}
              </Badge>
            </Field>
            <Field label="Department">{employee.department}</Field>
            <Field label="Level">{employee.level}</Field>
            <Field label="Country">{employee.country}</Field>
            <Field label="Gender">{employee.gender}</Field>
            <Field label="Local currency">{employee.localCurrency}</Field>
            <Field label="Hire date">{new Date(employee.hireDate).toLocaleDateString()}</Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current compensation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {latest ? (
              <>
                <Field label="Base">{formatMoney(latest.baseSalary, latest.currency)}</Field>
                <Field label="Bonus">{formatMoney(latest.bonus, latest.currency)}</Field>
                <Field label="Annual (USD)">
                  <span className="font-semibold">{formatMoney(latest.annualUsd)}</span>
                </Field>
              </>
            ) : (
              <p className="text-slate-400">No salary records.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salary history</CardTitle>
        </CardHeader>
        <CardContent>
          <SalaryHistoryTimeline history={employee.salaryHistory} />
        </CardContent>
      </Card>

      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Adjust salary">
        <SalaryAdjustForm
          employeeId={id}
          defaultCurrency={employee.localCurrency}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['employee', id] });
            setAdjustOpen(false);
          }}
          onCancel={() => setAdjustOpen(false)}
        />
      </Dialog>
    </div>
  );
}
