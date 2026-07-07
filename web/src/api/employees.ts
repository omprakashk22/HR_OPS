import { apiFetch } from './client';

export interface CurrentSalary {
  base: string;
  bonus: string;
  currency: string;
  annualUsd: string;
}

export interface EmployeeListItem {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  country: string;
  department: string;
  jobTitle: string;
  level: string;
  localCurrency: string;
  hireDate: string;
  status: string;
  currentSalary: CurrentSalary | null;
}

export interface EmployeeListResponse {
  data: EmployeeListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SalaryDto {
  id: string;
  baseSalary: string;
  bonus: string;
  currency: string;
  effectiveDate: string;
  reason: string;
  annualUsd: string;
}

export interface EmployeeDetail {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  country: string;
  department: string;
  jobTitle: string;
  level: string;
  localCurrency: string;
  hireDate: string;
  status: string;
  salaryHistory: SalaryDto[];
}

export interface EmployeeQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  country?: string;
  department?: string;
  level?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  gender: string;
  country: string;
  department: string;
  jobTitle: string;
  level: string;
  localCurrency: string;
  hireDate: string;
  baseSalary: string;
  bonus?: string;
  currency: string;
  effectiveDate: string;
}

export type UpdateEmployeePayload = Partial<
  Pick<
    CreateEmployeePayload,
    'firstName' | 'lastName' | 'gender' | 'country' | 'department' | 'jobTitle' | 'level' | 'localCurrency' | 'hireDate'
  >
>;

export interface SalaryChangePayload {
  baseSalary: string;
  bonus?: string;
  currency: string;
  effectiveDate: string;
  reason: string;
}

function toQueryString(q: EmployeeQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(q)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

export function listEmployees(q: EmployeeQuery): Promise<EmployeeListResponse> {
  return apiFetch(`/employees?${toQueryString(q)}`);
}

export function getEmployee(id: string): Promise<EmployeeDetail> {
  return apiFetch(`/employees/${id}`);
}

export function createEmployee(payload: CreateEmployeePayload): Promise<EmployeeDetail> {
  return apiFetch('/employees', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateEmployee(id: string, patch: UpdateEmployeePayload): Promise<EmployeeDetail> {
  return apiFetch(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteEmployee(id: string): Promise<void> {
  return apiFetch(`/employees/${id}`, { method: 'DELETE' });
}

export function addSalaryChange(id: string, payload: SalaryChangePayload): Promise<EmployeeDetail> {
  return apiFetch(`/employees/${id}/salary`, { method: 'POST', body: JSON.stringify(payload) });
}
