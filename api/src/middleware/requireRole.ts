import { RequestHandler } from 'express';
import { Role } from '@prisma/client';

/**
 * Guards a route to a single role. Applied to mutations so the system is
 * RBAC-ready without building unused role UI (only HR_MANAGER exists today).
 */
export function requireRole(role: Role): RequestHandler {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
