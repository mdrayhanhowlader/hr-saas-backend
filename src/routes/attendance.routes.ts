import { Router } from 'express';
import { getAttendances, checkIn, checkOut, getMyAttendance, updateAttendance, getAttendanceStats, biometricPunch } from '../controllers/attendance.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticate, getAttendanceStats);
router.get('/my', authenticate, getMyAttendance);
router.get('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), getAttendances);
router.post('/check-in', authenticate, checkIn);
router.post('/check-out', authenticate, checkOut);
router.post('/biometric-punch', biometricPunch);
router.put('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), updateAttendance);

export default router;
