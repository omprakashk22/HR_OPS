import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  OnChangeFn,
} from '@tanstack/react-table';
import { EmployeeListItem } from '../api/employees';
import { formatMoney } from '../lib/formatMoney';
import { Table, THead, TBody, TR, TH, TD } from './ui/table';
import { Badge } from './ui/badge';

const col = createColumnHelper<EmployeeListItem>();

// Sortable column ids match the API's allow-listed sort fields.
const columns = [
  col.accessor('employeeNumber', { header: 'ID', enableSorting: true }),
  col.display({
    id: 'name',
    header: 'Name',
    enableSorting: false,
    cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
  }),
  col.accessor('department', { header: 'Department', enableSorting: true }),
  col.accessor('country', { header: 'Country', enableSorting: true }),
  col.accessor('level', { header: 'Level', enableSorting: true }),
  col.display({
    id: 'salary',
    header: 'Current (USD)',
    enableSorting: false,
    cell: ({ row }) => formatMoney(row.original.currentSalary?.annualUsd),
  }),
  col.accessor('status', {
    header: 'Status',
    enableSorting: false,
    cell: ({ getValue }) => (
      <Badge variant={getValue() === 'ACTIVE' ? 'success' : 'muted'}>{String(getValue())}</Badge>
    ),
  }),
];

interface Props {
  data: EmployeeListItem[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  onRowClick: (id: string) => void;
}

export function EmployeeTable({ data, sorting, onSortingChange, onRowClick }: Props) {
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const sortIndicator: Record<string, string> = { asc: ' ▲', desc: ' ▼' };

  return (
    <Table>
      <THead>
        {table.getHeaderGroups().map((hg) => (
          <TR key={hg.id}>
            {hg.headers.map((h) => (
              <TH
                key={h.id}
                className={h.column.getCanSort() ? 'cursor-pointer select-none' : undefined}
                onClick={h.column.getToggleSortingHandler()}
              >
                {flexRender(h.column.columnDef.header, h.getContext())}
                {sortIndicator[h.column.getIsSorted() as string] ?? ''}
              </TH>
            ))}
          </TR>
        ))}
      </THead>
      <TBody>
        {data.length === 0 ? (
          <TR>
            <TD className="py-6 text-center text-slate-400" colSpan={columns.length}>
              No employees match your filters.
            </TD>
          </TR>
        ) : (
          table.getRowModel().rows.map((r) => (
            <TR key={r.id} className="cursor-pointer" onClick={() => onRowClick(r.original.id)}>
              {r.getVisibleCells().map((c) => (
                <TD key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TD>
              ))}
            </TR>
          ))
        )}
      </TBody>
    </Table>
  );
}
