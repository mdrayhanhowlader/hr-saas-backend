import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getHolidays, createHoliday, deleteHoliday, importDefaultHolidays } from '../controllers/holiday.controller';

const router = Router();

router.get('/', authenticate, getHolidays);
router.post('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), createHoliday);
router.delete('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), deleteHoliday);
router.post('/import', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), importDefaultHolidays);

export default router;
