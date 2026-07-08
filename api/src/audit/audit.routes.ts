import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { list } from './audit.controller';

export const auditRouter = Router();

// The audit log is ADMIN-only.
auditRouter.use(requireAuth, requireRole('ADMIN'));
auditRouter.get('/', list);
