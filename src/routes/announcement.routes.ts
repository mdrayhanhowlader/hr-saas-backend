import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../controllers/announcement.controller';

const router = Router();

router.get('/', authenticate, getAnnouncements);
router.post('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), createAnnouncement);
router.delete('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), deleteAnnouncement);

export default router;
