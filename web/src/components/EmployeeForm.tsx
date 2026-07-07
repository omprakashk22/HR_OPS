import { ReactNode } from 'react';
import { useForm, Resolver, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GENDERS, LEVELS, COUNTRIES, DEPARTMENTS, CURRENCIES } from '../lib/constants';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';

const money = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount');

const profile = {
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  gender: z.string().min(1),
  country: z.string().min(1),
  department: z.string().min(1),
  jobTitle: z.string().min(1, 'Required'),
  level: z.string().min(1),
  localCurrency: z.string().min(1),
  hireDate: z.string().min(1, 'Required'),
};

const createSchema = z.object({
  ...profile,
  baseSalary: money,
  bonus: money,
  currency: z.string().min(1),
  effectiveDate: z.string().min(1, 'Required'),
});
const editSchema = z.object(profile);

export type EmployeeFormValues = z.infer<typeof createSchema>;

interface Props {
  mode: 'create' | 'edit';
  initial: EmployeeFormValues;
  submitting: boolean;
  error?: string;
  onSubmit: SubmitHandler<EmployeeFormValues>;
  onCancel: () => void;
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function EmployeeForm({ mode, initial, submitting, error, onSubmit, onCancel }: Props) {
  const resolver = zodResolver(mode === 'create' ? createSchema : editSchema) as Resolver<EmployeeFormValues>;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormValues>({ resolver, defaultValues: initial });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" id="firstName" error={errors.firstName?.message}>
          <Input id="firstName" {...register('firstName')} />
        </Field>
        <Field label="Last name" id="lastName" error={errors.lastName?.message}>
          <Input id="lastName" {...register('lastName')} />
        </Field>
        <Field label="Job title" id="jobTitle" error={errors.jobTitle?.message}>
          <Input id="jobTitle" {...register('jobTitle')} />
        </Field>
        <Field label="Gender" id="gender">
          <Select id="gender" {...register('gender')}>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Level" id="level">
          <Select id="level" {...register('level')}>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Department" id="department">
          <Select id="department" {...register('department')}>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country" id="country">
          <Select id="country" {...register('country')}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Local currency" id="localCurrency">
          <Select id="localCurrency" {...register('localCurrency')}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hire date" id="hireDate" error={errors.hireDate?.message}>
          <Input id="hireDate" type="date" {...register('hireDate')} />
        </Field>
      </div>

      {mode === 'create' && (
        <div className="rounded-md border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Initial salary</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Base salary" id="baseSalary" error={errors.baseSalary?.message}>
              <Input id="baseSalary" {...register('baseSalary')} />
            </Field>
            <Field label="Bonus" id="bonus" error={errors.bonus?.message}>
              <Input id="bonus" {...register('bonus')} />
            </Field>
            <Field label="Currency" id="currency">
              <Select id="currency" {...register('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Effective date" id="effectiveDate" error={errors.effectiveDate?.message}>
              <Input id="effectiveDate" type="date" {...register('effectiveDate')} />
            </Field>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Create employee' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
