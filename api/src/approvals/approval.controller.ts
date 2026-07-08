import { RequestHandler } from 'express';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  replaceLevelsSchema,
  decisionSchema,
} from './approval.schemas';
import * as service from './approval.service';

function actor(req: Parameters<RequestHandler>[0]): service.Actor {
  return { userId: req.user!.sub, role: req.user!.role };
}

// ---- workflows ----

export const listWorkflows: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ data: await service.listWorkflows() });
  } catch (err) {
    next(err);
  }
};

export const getWorkflow: RequestHandler = async (req, res, next) => {
  try {
    res.json(await service.getWorkflow(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const createWorkflow: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await service.createWorkflow(createWorkflowSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
};

export const updateWorkflow: RequestHandler = async (req, res, next) => {
  try {
    res.json(await service.updateWorkflow(req.params.id, updateWorkflowSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
};

export const replaceLevels: RequestHandler = async (req, res, next) => {
  try {
    const { levels } = replaceLevelsSchema.parse(req.body);
    res.json(await service.replaceLevels(req.params.id, levels));
  } catch (err) {
    next(err);
  }
};

export const deleteWorkflow: RequestHandler = async (req, res, next) => {
  try {
    await service.deleteWorkflow(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ---- requests ----

export const listRequests: RequestHandler = async (req, res, next) => {
  try {
    const box = req.query.box === 'mine' ? 'mine' : 'inbox';
    res.json({ data: await service.listRequests(actor(req), box) });
  } catch (err) {
    next(err);
  }
};

export const getRequest: RequestHandler = async (req, res, next) => {
  try {
    res.json(await service.getRequest(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const decide: RequestHandler = async (req, res, next) => {
  try {
    res.json(await service.decide(req.params.id, actor(req), decisionSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
};

export const resubmit: RequestHandler = async (req, res, next) => {
  try {
    res.json(await service.resubmit(req.params.id, req.user!.sub));
  } catch (err) {
    next(err);
  }
};
