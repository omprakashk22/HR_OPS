import * as repo from './audit.repository';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

interface Snapshot {
  [key: string]: unknown;
}

/** Derive a human-readable label for a record from its before/after snapshot. */
function deriveLabel(before: unknown, after: unknown): string | null {
  const snap = (after ?? before) as Snapshot | null;
  if (!snap) return null;
  if (snap.employeeNumber) {
    const name = [snap.firstName, snap.lastName].filter(Boolean).join(' ');
    return name ? `${snap.employeeNumber} · ${name}` : String(snap.employeeNumber);
  }
  if (snap.name) return String(snap.name);
  if (snap.email) return String(snap.email);
  if (snap.reason) return String(snap.reason);
  if (snap.category && snap.amount) return `${snap.category} · ${snap.amount}`;
  return null;
}

export async function listAudit(query: { model?: string; recordId?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  const filters = { model: query.model, recordId: query.recordId };

  const [rows, total] = await Promise.all([
    repo.listAuditLogs({ ...filters, take: pageSize, skip: (page - 1) * pageSize }),
    repo.countAuditLogs(filters),
  ]);

  const actorIds = [...new Set(rows.map((r) => r.actorUserId).filter((id): id is string => !!id))];
  const actors = actorIds.length ? await repo.findUsersByIds(actorIds) : [];
  const actorMap = new Map(actors.map((u) => [u.id, u]));

  const data = rows.map((r) => {
    const actor = r.actorUserId ? actorMap.get(r.actorUserId) ?? null : null;
    return {
      ...r,
      actor, // { id, name, email } | null
      label: deriveLabel(r.before, r.after),
    };
  });

  return { data, page, pageSize, total };
}
