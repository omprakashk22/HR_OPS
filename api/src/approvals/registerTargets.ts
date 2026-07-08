import { registerApprovalTarget } from './registry';
import { reimbursementApprovalTarget } from '../reimbursements/reimbursement.approvalTarget';

/** Wire approval consumers at startup (called once from app.ts). */
export function registerApprovalTargets(): void {
  registerApprovalTarget('Reimbursement', reimbursementApprovalTarget);
}
