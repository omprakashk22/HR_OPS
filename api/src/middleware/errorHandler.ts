import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../shared/httpError';
import { env } from '../config/env';

/** Central error translator: Zod → 400, HttpError → its status, else 500. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'ValidationError', details: err.flatten() });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(500).json({ error: 'InternalServerError' });
};
