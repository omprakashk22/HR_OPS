import { RequestHandler } from 'express';
import * as service from './audit.service';

export const list: RequestHandler = async (req, res, next) => {
  try {
    const model = typeof req.query.model === 'string' ? req.query.model : undefined;
    const recordId = typeof req.query.recordId === 'string' ? req.query.recordId : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    res.json(await service.listAudit({ model, recordId, page }));
  } catch (err) {
    next(err);
  }
};
