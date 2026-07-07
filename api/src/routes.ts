import { Router } from 'express';
import { authRouter } from './auth/auth.routes';
import { employeeRouter } from './employees/employee.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/employees', employeeRouter);
