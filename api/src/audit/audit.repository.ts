import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

function buildWhere(opts: { model?: string; recordId?: string }): Prisma.AuditLogWhereInput {
  return {
    ...(opts.model ? { model: opts.model } : {}),
    ...(opts.recordId ? { recordId: opts.recordId } : {}),
  };
}

export function listAuditLogs(opts: { model?: string; recordId?: string; take: number; skip: number }) {
  return prisma.auditLog.findMany({
    where: buildWhere(opts),
    orderBy: { createdAt: 'desc' },
    take: opts.take,
    skip: opts.skip,
  });
}

export function countAuditLogs(opts: { model?: string; recordId?: string }) {
  return prisma.auditLog.count({ where: buildWhere(opts) });
}

export function findUsersByIds(ids: string[]) {
  return prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
}
