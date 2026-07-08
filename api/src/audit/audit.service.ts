import * as repo from './audit.repository';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function listAudit(query: { model?: string; recordId?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  const filters = { model: query.model, recordId: query.recordId };
  const [data, total] = await Promise.all([
    repo.listAuditLogs({ ...filters, take: pageSize, skip: (page - 1) * pageSize }),
    repo.countAuditLogs(filters),
  ]);
  return { data, page, pageSize, total };
}
