import { Prisma, EmployeeStatus, Level } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ListQuery } from '../shared/pagination';
import { CreateEmployeeInput, UpdateEmployeeInput, SalaryChangeInput } from './employee.schemas';

// Latest salary row for grid display (newest effectiveDate, ties by createdAt).
const latestSalaryArg = {
  orderBy: [{ effectiveDate: 'desc' as const }, { createdAt: 'desc' as const }],
  take: 1,
};

export type EmployeeWithSalary = Prisma.EmployeeGetPayload<{ include: { salaryHistory: true } }>;

function buildWhere(q: ListQuery): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};

  where.status =
    q.status && (Object.values(EmployeeStatus) as string[]).includes(q.status)
      ? (q.status as EmployeeStatus)
      : EmployeeStatus.ACTIVE;

  if (q.country) where.country = q.country;
  if (q.department) where.department = q.department;
  if (q.level && (Object.values(Level) as string[]).includes(q.level)) {
    where.level = q.level as Level;
  }
  if (q.search) {
    where.OR = [
      { firstName: { contains: q.search, mode: 'insensitive' } },
      { lastName: { contains: q.search, mode: 'insensitive' } },
      { employeeNumber: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function listEmployees(
  q: ListQuery,
): Promise<{ rows: EmployeeWithSalary[]; total: number }> {
  const where = buildWhere(q);
  const orderBy = { [q.sortBy]: q.sortDir } as Prisma.EmployeeOrderByWithRelationInput;
  const [rows, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { salaryHistory: latestSalaryArg },
    }),
    prisma.employee.count({ where }),
  ]);
  return { rows, total };
}

export function getEmployeeById(id: string): Promise<EmployeeWithSalary | null> {
  return prisma.employee.findUnique({
    where: { id },
    include: { salaryHistory: { orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }] } },
  });
}

export async function getCurrencyRates(): Promise<Record<string, Prisma.Decimal>> {
  const rates = await prisma.currencyRate.findMany();
  return Object.fromEntries(rates.map((r) => [r.code, r.rateToUsd]));
}

export async function employeeExists(id: string): Promise<boolean> {
  return (await prisma.employee.count({ where: { id } })) > 0;
}

export function createEmployeeWithSalary(
  input: CreateEmployeeInput,
  changedBy: string,
): Promise<EmployeeWithSalary> {
  return prisma.$transaction(async (tx) => {
    const last = await tx.employee.findFirst({
      orderBy: { employeeNumber: 'desc' },
      select: { employeeNumber: true },
    });
    const nextNum = last ? Number(last.employeeNumber.slice(1)) + 1 : 1;
    const employeeNumber = `E${String(nextNum).padStart(5, '0')}`;

    return tx.employee.create({
      data: {
        employeeNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender,
        country: input.country,
        department: input.department,
        jobTitle: input.jobTitle,
        level: input.level,
        localCurrency: input.localCurrency,
        hireDate: input.hireDate,
        salaryHistory: {
          create: {
            baseSalary: new Prisma.Decimal(input.baseSalary),
            bonus: new Prisma.Decimal(input.bonus),
            currency: input.currency,
            effectiveDate: input.effectiveDate,
            reason: 'Initial hire',
            changedBy,
          },
        },
      },
      include: { salaryHistory: true },
    });
  });
}

export function updateEmployee(id: string, patch: UpdateEmployeeInput) {
  return prisma.employee.update({ where: { id }, data: patch });
}

export function terminateEmployee(id: string) {
  return prisma.employee.update({ where: { id }, data: { status: EmployeeStatus.TERMINATED } });
}

export function addSalaryRow(id: string, input: SalaryChangeInput, changedBy: string) {
  return prisma.salaryHistory.create({
    data: {
      employeeId: id,
      baseSalary: new Prisma.Decimal(input.baseSalary),
      bonus: new Prisma.Decimal(input.bonus),
      currency: input.currency,
      effectiveDate: input.effectiveDate,
      reason: input.reason,
      changedBy,
    },
  });
}
