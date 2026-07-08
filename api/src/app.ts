import express, { Express } from 'express';
import cors from 'cors';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { registerApprovalTargets } from './approvals/registerTargets';
import { requestContext } from './context/requestContext';

// Wire approval consumers (e.g. Reimbursement) into the engine at startup.
registerApprovalTargets();

export const app: Express = express();

app.use(cors());
app.use(express.json());

// Establish a per-request async context so the audit extension can attribute
// writes to the acting user (populated by requireAuth once the JWT verifies).
app.use((_req, _res, next) => requestContext.run({}, next));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1', apiRouter);

// Error handler must be registered last.
app.use(errorHandler);
