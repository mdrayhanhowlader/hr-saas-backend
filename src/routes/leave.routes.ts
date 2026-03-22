import { Router } from 'express';
import {
  getLeaveTypes,
  createLeaveType,
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus,
  getMyLeaves,
  getLeaveBalances,
  initializeLeaveBalances,
} from '../controllers/leave.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/types', authenticate, getLeaveTypes);
router.post('/types', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), createLeaveType);
router.get('/balances', authenticate, getLeaveBalances);
router.get('/my', authenticate, getMyLeaves);
router.post('/initialize', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), initializeLeaveBalances);
router.get('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), getLeaveRequests);
router.post('/', authenticate, createLeaveRequest);
router.put('/:id/status', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), updateLeaveStatus);

export default router;
