import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { list, getOne, create, update, remove, addSalary } from './employee.controller';

export const employeeRouter = Router();

employeeRouter.use(requireAuth);

employeeRouter.get('/', list);
employeeRouter.get('/:id', getOne);
employeeRouter.post('/', requireRole('HR_MANAGER'), create);
employeeRouter.patch('/:id', requireRole('HR_MANAGER'), update);
employeeRouter.delete('/:id', requireRole('HR_MANAGER'), remove);
employeeRouter.post('/:id/salary', requireRole('HR_MANAGER'), addSalary);
