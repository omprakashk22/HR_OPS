import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { create, list, getOne } from './reimbursement.controller';

export const reimbursementRouter = Router();

reimbursementRouter.use(requireAuth);

reimbursementRouter.get('/', list);
reimbursementRouter.get('/:id', getOne);
reimbursementRouter.post('/', create);
