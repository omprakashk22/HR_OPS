import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { addSalaryChange } from '../api/employees';
import { ApiError } from '../api/client';
import { CURRENCIES } from '../lib/constants';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';

const money = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount');

const schema = z.object({
  baseSalary: money,
  bonus: money,
  currency: z.string().min(3),
  effectiveDate: z.string().min(1, 'Required'),
  reason: z.string().min(1, 'Required'),
});
type FormValues = z.infer<typeof schema>;

const REASONS = ['Annual raise', 'Promotion', 'Market adjustment', 'Correction'];

interface Props {
  employeeId: string;
  defaultCurrency: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SalaryAdjustForm({ employeeId, defaultCurrency, onSuccess, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      baseSalary: '',
      bonus: '0',
      currency: defaultCurrency,
      effectiveDate: '',
      reason: 'Annual raise',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => addSalaryChange(employeeId, values),
    onSuccess,
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
      <div>
        <Label htmlFor="baseSalary">Base salary</Label>
        <Input id="baseSalary" {...register('baseSalary')} />
        {errors.baseSalary && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {errors.baseSalary.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="bonus">Bonus</Label>
        <Input id="bonus" {...register('bonus')} />
        {errors.bonus && <p className="mt-1 text-xs text-red-600">{errors.bonus.message}</p>}
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
      <div>
        <Label htmlFor="effectiveDate">Effective date</Label>
        <Input id="effectiveDate" type="date" {...register('effectiveDate')} />
        {errors.effectiveDate && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {errors.effectiveDate.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="reason">Reason</Label>
        <Select id="reason" {...register('reason')}>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>
      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Failed to save'}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
