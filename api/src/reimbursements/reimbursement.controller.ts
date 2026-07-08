import { RequestHandler } from 'express';
import { createReimbursementSchema } from './reimbursement.schemas';
import * as service from './reimbursement.service';

function actor(req: Parameters<RequestHandler>[0]): service.ReimbursementActor {
  return { userId: req.user!.sub, role: req.user!.role };
}

export const create: RequestHandler = async (req, res, next) => {
  try {
    const input = createReimbursementSchema.parse(req.body);
    res.status(201).json(await service.createReimbursement(actor(req), input));
  } catch (err) {
    next(err);
  }
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    const box = req.query.box === 'all' ? 'all' : 'mine';
    res.json({ data: await service.listReimbursements(actor(req), box) });
  } catch (err) {
    next(err);
  }
};

export const getOne: RequestHandler = async (req, res, next) => {
  try {
    res.json(await service.getReimbursement(req.params.id));
  } catch (err) {
    next(err);
  }
};
