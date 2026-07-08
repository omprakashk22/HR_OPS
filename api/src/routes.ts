import { Router } from 'express';
import { authRouter } from './auth/auth.routes';
import { employeeRouter } from './employees/employee.routes';
import { analyticsRouter } from './analytics/analytics.routes';
import { approvalRouter } from './approvals/approval.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/employees', employeeRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/approvals', approvalRouter);
