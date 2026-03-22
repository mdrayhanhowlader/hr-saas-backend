import { Router } from 'express';
import { getTenant, updateTenant } from '../controllers/tenant.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getTenant);
router.put('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), updateTenant);

export default router;
