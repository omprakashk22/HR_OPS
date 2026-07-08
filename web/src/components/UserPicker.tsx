import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listUsers } from '../api/approvals';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { Input } from './ui/input';
import { Select } from './ui/select';

/** Searchable user dropdown for USER-level approvers (value = User.id). */
export function UserPicker({
  value,
  onChange,
  ariaPrefix,
}: {
  value: string | null | undefined;
  onChange: (id: string) => void;
  ariaPrefix: string;
}) {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 250);
  const { data } = useQuery({
    queryKey: ['approver-users', debounced],
    queryFn: () => listUsers(debounced || undefined),
  });

  return (
    <div className="space-y-1">
      <Input
        aria-label={`${ariaPrefix} search users`}
        placeholder="Search users"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select aria-label={`${ariaPrefix} approver user`} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">— choose user —</option>
        {data?.data.map((u) => (
          <option key={u.id} value={u.id}>
            {u.email} ({u.role})
          </option>
        ))}
      </Select>
    </div>
  );
}
