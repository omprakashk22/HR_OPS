import express, { Express } from 'express';
import cors from 'cors';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { registerApprovalTargets } from './approvals/registerTargets';

// Wire approval consumers (e.g. Reimbursement) into the engine at startup.
registerApprovalTargets();

export const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1', apiRouter);

// Error handler must be registered last.
app.use(errorHandler);
