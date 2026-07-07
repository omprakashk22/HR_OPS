import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { summary, distribution, histogram, equity } from './analytics.controller';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get('/summary', summary);
analyticsRouter.get('/distribution', distribution);
analyticsRouter.get('/histogram', histogram);
analyticsRouter.get('/equity', equity);
