import { RequestHandler } from 'express';
import * as service from './analytics.service';

export const summary: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await service.getSummary());
  } catch (err) {
    next(err);
  }
};

export const distribution: RequestHandler = async (req, res, next) => {
  try {
    res.json(await service.getDistribution(String(req.query.groupBy ?? 'country')));
  } catch (err) {
    next(err);
  }
};

export const histogram: RequestHandler = async (req, res, next) => {
  try {
    res.json(await service.getHistogram(Number(req.query.bucketSize ?? 10000)));
  } catch (err) {
    next(err);
  }
};

export const equity: RequestHandler = async (req, res, next) => {
  try {
    res.json(
      await service.getEquity(String(req.query.dimension ?? 'gender'), String(req.query.within ?? 'level')),
    );
  } catch (err) {
    next(err);
  }
};
