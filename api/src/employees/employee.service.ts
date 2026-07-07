import { Prisma, SalaryHistory } from '@prisma/client';
import * as repo from './employee.repository';
import { EmployeeWithSalary } from './employee.repository';
import { ListQuery } from '../shared/pagination';
import { HttpError } from '../shared/httpError';
import { normalizeToUsd, formatMoneyString } from '../shared/currency';
import { CreateEmployeeInput, UpdateEmployeeInput, SalaryChangeInput } from './employee.schemas';

type Rates = Record<string, Prisma.Decimal>;

export interface SalaryDto {
  id: string;
  baseSalary: string;
  bonus: string;
  currency: string;
  effectiveDate: string;
  reason: string;
  annualUsd: string;
}

export interface EmployeeListItemDto {
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
  currentSalary: { base: string; bonus: string; currency: string; annualUsd: string } | null;
}

export interface EmployeeDetailDto extends Omit<EmployeeListItemDto, 'currentSalary'> {
  salaryHistory: SalaryDto[];
}

function annualUsd(base: Prisma.Decimal, bonus: Prisma.Decimal, currency: string, rates: Rates): string {
  return formatMoneyString(normalizeToUsd(base.add(bonus), currency, rates));
}

function toSalaryDto(s: SalaryHistory, rates: Rates): SalaryDto {
  return {
    id: s.id,
    baseSalary: formatMoneyString(s.baseSalary),
    bonus: formatMoneyString(s.bonus),
    currency: s.currency,
    effectiveDate: s.effectiveDate.toISOString(),
    reason: s.reason,
    annualUsd: annualUsd(s.baseSalary, s.bonus, s.currency, rates),
  };
}

function baseFields(e: EmployeeWithSalary) {
  return {
    id: e.id,
    employeeNumber: e.employeeNumber,
    firstName: e.firstName,
    lastName: e.lastName,
    gender: e.gender,
    country: e.country,
    department: e.department,
    jobTitle: e.jobTitle,
    level: e.level,
    localCurrency: e.localCurrency,
    hireDate: e.hireDate.toISOString(),
    status: e.status,
  };
}

function toListItem(e: EmployeeWithSalary, rates: Rates): EmployeeListItemDto {
  const latest = e.salaryHistory[0];
  return {
    ...baseFields(e),
    currentSalary: latest
      ? {
          base: formatMoneyString(latest.baseSalary),
          bonus: formatMoneyString(latest.bonus),
          currency: latest.currency,
          annualUsd: annualUsd(latest.baseSalary, latest.bonus, latest.currency, rates),
        }
      : null,
  };
}

function toDetail(e: EmployeeWithSalary, rates: Rates): EmployeeDetailDto {
  return { ...baseFields(e), salaryHistory: e.salaryHistory.map((s) => toSalaryDto(s, rates)) };
}

export async function listEmployees(q: ListQuery) {
  const [{ rows, total }, rates] = await Promise.all([repo.listEmployees(q), repo.getCurrencyRates()]);
  return {
    data: rows.map((e) => toListItem(e, rates)),
    page: q.page,
    pageSize: q.pageSize,
    total,
  };
}

export async function getEmployee(id: string): Promise<EmployeeDetailDto> {
  const [employee, rates] = await Promise.all([repo.getEmployeeById(id), repo.getCurrencyRates()]);
  if (!employee) throw new HttpError(404, 'Employee not found');
  return toDetail(employee, rates);
}

export async function createEmployee(input: CreateEmployeeInput, changedBy: string): Promise<EmployeeDetailDto> {
  const employee = await repo.createEmployeeWithSalary(input, changedBy);
  return getEmployee(employee.id);
}

export async function updateEmployee(id: string, patch: UpdateEmployeeInput): Promise<EmployeeDetailDto> {
  if (!(await repo.employeeExists(id))) throw new HttpError(404, 'Employee not found');
  await repo.updateEmployee(id, patch);
  return getEmployee(id);
}

export async function deleteEmployee(id: string): Promise<void> {
  if (!(await repo.employeeExists(id))) throw new HttpError(404, 'Employee not found');
  await repo.terminateEmployee(id);
}

export async function addSalaryChange(
  id: string,
  input: SalaryChangeInput,
  changedBy: string,
): Promise<EmployeeDetailDto> {
  if (!(await repo.employeeExists(id))) throw new HttpError(404, 'Employee not found');
  await repo.addSalaryRow(id, input, changedBy);
  return getEmployee(id);
}
