import { Router } from 'express';
import { authRouter } from './auth/auth.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
