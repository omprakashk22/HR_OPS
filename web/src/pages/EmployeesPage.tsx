import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SortingState } from '@tanstack/react-table';
import { listEmployees, EmployeeQuery } from '../api/employees';
import { EmployeeTable } from '../components/EmployeeTable';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { COUNTRIES, DEPARTMENTS, LEVELS } from '../lib/constants';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';

const PAGE_SIZE = 25;

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [country, setCountry] = useState('');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'employeeNumber', desc: false }]);

  const sort = sorting[0];
  const query: EmployeeQuery = {
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    country: country || undefined,
    department: department || undefined,
    level: level || undefined,
    sortBy: sort?.id,
    sortDir: sort?.desc ? 'desc' : 'asc',
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees', query],
    queryFn: () => listEmployees(query),
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Employees</h1>
        <Button onClick={() => navigate('/employees/new')}>Add employee</Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Input
          placeholder="Search name or ID"
          aria-label="Search employees"
          value={search}
          onChange={(e) => resetToFirstPage(setSearch)(e.target.value)}
        />
        <Select
          aria-label="Filter by country"
          value={country}
          onChange={(e) => resetToFirstPage(setCountry)(e.target.value)}
        >
          <option value="">All countries</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by department"
          value={department}
          onChange={(e) => resetToFirstPage(setDepartment)(e.target.value)}
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by level"
          value={level}
          onChange={(e) => resetToFirstPage(setLevel)(e.target.value)}
        >
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </div>

      {isError ? (
        <p className="text-red-600">Failed to load employees.</p>
      ) : isLoading && !data ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <EmployeeTable
            data={data?.data ?? []}
            sorting={sorting}
            onSortingChange={(updater) => {
              setSorting(updater);
              setPage(1);
            }}
            onRowClick={(id) => navigate(`/employees/${id}`)}
          />
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>{total.toLocaleString()} employees</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
