import { RequestHandler } from 'express';
import { parseListQuery } from '../shared/pagination';
import { createEmployeeSchema, updateEmployeeSchema, salaryChangeSchema } from './employee.schemas';
import * as service from './employee.service';

export const list: RequestHandler = async (req, res, next) => {
  try {
    res.json(await service.listEmployees(parseListQuery(req.query as Record<string, unknown>)));
  } catch (err) {
    next(err);
  }
};

export const getOne: RequestHandler = async (req, res, next) => {
  try {
    res.json(await service.getEmployee(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const input = createEmployeeSchema.parse(req.body);
    res.status(201).json(await service.createEmployee(input, req.user!.sub));
  } catch (err) {
    next(err);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const patch = updateEmployeeSchema.parse(req.body);
    res.json(await service.updateEmployee(req.params.id, patch));
  } catch (err) {
    next(err);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await service.deleteEmployee(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const addSalary: RequestHandler = async (req, res, next) => {
  try {
    const input = salaryChangeSchema.parse(req.body);
    res.status(201).json(await service.addSalaryChange(req.params.id, input, req.user!.sub));
  } catch (err) {
    next(err);
  }
};
