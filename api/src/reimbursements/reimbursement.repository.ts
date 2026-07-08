import { Prisma, ReimbursementStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export function createReimbursement(data: {
  employeeId: string;
  amount: string;
  currency: string;
  category: string;
  note: string;
  submittedBy: string;
}) {
  return prisma.reimbursement.create({
    data: { ...data, amount: new Prisma.Decimal(data.amount) },
  });
}

export function getReimbursementById(id: string) {
  return prisma.reimbursement.findUnique({ where: { id } });
}

export function setStatus(id: string, status: ReimbursementStatus) {
  return prisma.reimbursement.update({ where: { id }, data: { status } });
}

export function listReimbursements(where: Prisma.ReimbursementWhereInput) {
  return prisma.reimbursement.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function employeeExists(id: string): Promise<boolean> {
  return (await prisma.employee.count({ where: { id } })) > 0;
}

export async function getUserEmployeeId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { employeeId: true } });
  return user?.employeeId ?? null;
}

export async function getCurrencyRates(): Promise<Record<string, Prisma.Decimal>> {
  const rates = await prisma.currencyRate.findMany();
  return Object.fromEntries(rates.map((r) => [r.code, r.rateToUsd]));
}
