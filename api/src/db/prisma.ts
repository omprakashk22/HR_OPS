import { PrismaClient, AuditAction } from '@prisma/client';
import { env } from '../config/env';
import { getActorUserId } from '../context/requestContext';

// In tests, point the app's client at the dedicated test database so
// integration tests never touch dev data.
const url = env.NODE_ENV === 'test' ? env.DATABASE_URL_TEST : env.DATABASE_URL;

// Base client: used directly for audit reads/writes so the audit extension
// never recurses on itself.
const base = new PrismaClient({ datasources: { db: { url } } });

// camelCase delegate accessor for a PascalCase model name.
function delegateFor(model: string): { findUnique: (args: unknown) => Promise<unknown> } {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  return (base as unknown as Record<string, { findUnique: (args: unknown) => Promise<unknown> }>)[key];
}

const REDACT = new Set(['passwordHash']);

// Normalize a Prisma row to a plain JSON value (Decimal→string, Date→ISO) and
// redact sensitive fields so secrets never land in the audit log.
function toJson(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  const plain = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  for (const key of REDACT) {
    if (key in plain) plain[key] = '[redacted]';
  }
  return plain;
}

async function writeAudit(
  model: string,
  recordId: string | undefined,
  action: AuditAction,
  before: unknown,
  after: unknown,
): Promise<void> {
  if (!recordId) return;
  try {
    await base.auditLog.create({
      data: {
        model,
        recordId,
        action,
        actorUserId: getActorUserId() ?? null,
        before: (toJson(before) as object) ?? undefined,
        after: (toJson(after) as object) ?? undefined,
      },
    });
  } catch {
    // Auditing must never break the primary operation.
  }
}

export const prisma = base.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const result = await query(args);
        if (model !== 'AuditLog') {
          await writeAudit(model, (result as { id?: string }).id, 'CREATE', null, result);
        }
        return result;
      },
      async update({ model, args, query }) {
        let before: unknown = null;
        if (model !== 'AuditLog') {
          try {
            before = await delegateFor(model).findUnique({ where: (args as { where: unknown }).where });
          } catch {
            /* best-effort before-image */
          }
        }
        const result = await query(args);
        if (model !== 'AuditLog') {
          await writeAudit(model, (result as { id?: string }).id, 'UPDATE', before, result);
        }
        return result;
      },
      async delete({ model, args, query }) {
        let before: { id?: string } | null = null;
        if (model !== 'AuditLog') {
          try {
            before = (await delegateFor(model).findUnique({ where: (args as { where: unknown }).where })) as {
              id?: string;
            } | null;
          } catch {
            /* best-effort before-image */
          }
        }
        const result = await query(args);
        if (model !== 'AuditLog') {
          const id = (result as { id?: string }).id ?? before?.id;
          await writeAudit(model, id, 'DELETE', before, null);
        }
        return result;
      },
    },
  },
});
