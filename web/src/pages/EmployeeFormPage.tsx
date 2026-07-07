import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  getEmployee,
  createEmployee,
  updateEmployee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
} from '../api/employees';
import { ApiError } from '../api/client';
import { EmployeeForm, EmployeeFormValues } from '../components/EmployeeForm';

const emptyInitial: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  gender: 'FEMALE',
  country: 'US',
  department: 'Engineering',
  jobTitle: '',
  level: 'L2_MID',
  localCurrency: 'USD',
  hireDate: '',
  baseSalary: '',
  bonus: '0',
  currency: 'USD',
  effectiveDate: '',
};

export default function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(id!),
    enabled: isEdit,
  });

  const createMut = useMutation({
    mutationFn: (v: CreateEmployeePayload) => createEmployee(v),
    onSuccess: (emp) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate(`/employees/${emp.id}`);
    },
  });

  const updateMut = useMutation({
    mutationFn: (v: UpdateEmployeePayload) => updateEmployee(id!, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate(`/employees/${id}`);
    },
  });

  if (isEdit && isLoading) return <p className="text-slate-500">Loading…</p>;

  const initial: EmployeeFormValues =
    isEdit && employee
      ? {
          ...emptyInitial,
          firstName: employee.firstName,
          lastName: employee.lastName,
          gender: employee.gender,
          country: employee.country,
          department: employee.department,
          jobTitle: employee.jobTitle,
          level: employee.level,
          localCurrency: employee.localCurrency,
          hireDate: employee.hireDate.slice(0, 10),
          currency: employee.localCurrency,
        }
      : emptyInitial;

  const mutation = isEdit ? updateMut : createMut;
  const error = mutation.isError
    ? mutation.error instanceof ApiError
      ? mutation.error.message
      : 'Failed to save'
    : '';

  return (
    <div className="max-w-2xl">
      <Link
        to={isEdit ? `/employees/${id}` : '/employees'}
        className="text-sm text-slate-500 hover:underline"
      >
        ← Back
      </Link>
      <h1 className="mb-4 mt-1 text-2xl font-semibold">{isEdit ? 'Edit employee' : 'New employee'}</h1>
      <EmployeeForm
        mode={isEdit ? 'edit' : 'create'}
        initial={initial}
        submitting={mutation.isPending}
        error={error}
        onSubmit={(values) => {
          if (isEdit) {
            // editSchema already strips salary fields; send profile only.
            const { firstName, lastName, gender, country, department, jobTitle, level, localCurrency, hireDate } =
              values;
            updateMut.mutate({ firstName, lastName, gender, country, department, jobTitle, level, localCurrency, hireDate });
          } else {
            createMut.mutate(values);
          }
        }}
        onCancel={() => navigate(isEdit ? `/employees/${id}` : '/employees')}
      />
    </div>
  );
}
