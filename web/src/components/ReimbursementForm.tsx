import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createReimbursement } from '../api/reimbursements';
import { listEmployees } from '../api/employees';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { CURRENCIES, REIMBURSEMENT_CATEGORIES } from '../lib/constants';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';

const schema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount'),
  currency: z.string().min(3),
  category: z.string().min(1),
  note: z.string().min(1, 'Required'),
});
type FormValues = z.infer<typeof schema>;

const PRIVILEGED = ['ADMIN', 'HR_MANAGER'];

export function ReimbursementForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const privileged = !!user && PRIVILEGED.includes(user.role);

  const [employeeId, setEmployeeId] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const debouncedSearch = useDebouncedValue(empSearch, 300);
  const empQuery = useQuery({
    queryKey: ['emp-picker', debouncedSearch],
    queryFn: () => listEmployees({ search: debouncedSearch || undefined, pageSize: 10 }),
    enabled: privileged,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', currency: 'USD', category: 'Travel', note: '' },
  });

  const [subjectError, setSubjectError] = useState('');
  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      createReimbursement({ ...v, employeeId: privileged ? employeeId : undefined }),
    onSuccess: () => {
      reset();
      setEmployeeId('');
      setEmpSearch('');
      onCreated();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((v) => {
        if (privileged && !employeeId) {
          setSubjectError('Select an employee');
          return;
        }
        setSubjectError('');
        mutation.mutate(v);
      })}
      className="space-y-3"
    >
      {privileged && (
        <div>
          <Label htmlFor="empSearch">Employee</Label>
          <Input
            id="empSearch"
            placeholder="Search name or ID"
            aria-label="Search employee"
            value={empSearch}
            onChange={(e) => setEmpSearch(e.target.value)}
          />
          <Select
            aria-label="Select employee"
            className="mt-2"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">— choose —</option>
            {empQuery.data?.data.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employeeNumber} · {emp.firstName} {emp.lastName}
              </option>
            ))}
          </Select>
          {subjectError && <p role="alert" className="mt-1 text-xs text-red-600">{subjectError}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" {...register('amount')} />
          {errors.amount && <p role="alert" className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select id="currency" {...register('currency')}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select id="category" {...register('category')}>
          {REIMBURSEMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="note">Note</Label>
        <Input id="note" {...register('note')} />
        {errors.note && <p role="alert" className="mt-1 text-xs text-red-600">{errors.note.message}</p>}
      </div>

      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Failed to submit'}
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Submitting…' : 'Submit claim'}
      </Button>
    </form>
  );
}
