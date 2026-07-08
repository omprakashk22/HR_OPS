import { Router, RequestHandler } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as c from './approval.controller';

export const approvalRouter = Router();

approvalRouter.use(requireAuth);

// Requests — any authenticated user; visibility is scoped in the service.
approvalRouter.get('/requests', c.listRequests);
approvalRouter.get('/requests/:id', c.getRequest);
approvalRouter.post('/requests/:id/decision', c.decide);
approvalRouter.post('/requests/:id/resubmit', c.resubmit);

// Workflow configuration — ADMIN or HR_MANAGER only (either role).
const canConfigure: RequestHandler = (req, res, next) => {
  if (req.user?.role === 'ADMIN' || req.user?.role === 'HR_MANAGER') return next();
  res.status(403).json({ error: 'Forbidden' });
};
approvalRouter.use('/workflows', canConfigure);

approvalRouter.get('/workflows', c.listWorkflows);
approvalRouter.get('/workflows/:id', c.getWorkflow);
approvalRouter.post('/workflows', c.createWorkflow);
approvalRouter.patch('/workflows/:id', c.updateWorkflow);
approvalRouter.put('/workflows/:id/levels', c.replaceLevels);
approvalRouter.delete('/workflows/:id', c.deleteWorkflow);
