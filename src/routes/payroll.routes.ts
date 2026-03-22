import { Router } from 'express';
import {
  getPayrolls, generatePayroll, getMyPayslips,
  updatePayrollStatus, bulkUpdatePayrollStatus,
  getPayrollStats, getPayslipData,
} from '../controllers/payroll.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), getPayrollStats);
router.get('/my', authenticate, getMyPayslips);
router.get('/:id/payslip', authenticate, getPayslipData);
router.get('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), getPayrolls);
router.post('/generate', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), generatePayroll);
router.post('/bulk-status', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), bulkUpdatePayrollStatus);
router.put('/:id/status', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), updatePayrollStatus);

export default router;
