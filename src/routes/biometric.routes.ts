import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getDevices, addDevice, deleteDevice } from '../controllers/biometric.controller';

const router = Router();

router.get('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), getDevices);
router.post('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), addDevice);
router.delete('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), deleteDevice);

export default router;
