import { ApprovalTarget } from '../approvals/registry';
import { normalizeToUsd, formatMoneyString } from '../shared/currency';
import { HttpError } from '../shared/httpError';
import * as repo from './reimbursement.repository';

/**
 * The engine reads a reimbursement row through this adapter. `loadContext`
 * exposes a **USD-normalized `amountUsd`** so workflow conditions compare on a
 * common unit (never the raw local amount). Hooks set the terminal status.
 */
export const reimbursementApprovalTarget: ApprovalTarget = {
  async loadContext(entityId: string): Promise<Record<string, unknown>> {
    const r = await repo.getReimbursementById(entityId);
    if (!r) throw new HttpError(404, 'Reimbursement not found');
    const rates = await repo.getCurrencyRates();
    return {
      amount: formatMoneyString(r.amount),
      currency: r.currency,
      amountUsd: formatMoneyString(normalizeToUsd(r.amount, r.currency, rates)),
      category: r.category,
    };
  },
  async onApproved(entityId: string): Promise<void> {
    await repo.setStatus(entityId, 'PAYABLE');
  },
  async onRejected(entityId: string): Promise<void> {
    await repo.setStatus(entityId, 'REJECTED');
  },
};
