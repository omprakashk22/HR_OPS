import { Router } from 'express';
import { postLogin, getMe } from './auth.controller';
import { requireAuth } from '../middleware/requireAuth';

export const authRouter = Router();

authRouter.post('/login', postLogin);
authRouter.get('/me', requireAuth, getMe);
