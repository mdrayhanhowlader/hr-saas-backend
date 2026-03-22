import { Router } from 'express';
import { getReviews, createReview, updateReview, getMyReviews, acknowledgeReview } from '../controllers/performance.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/my', authenticate, getMyReviews);
router.get('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), getReviews);
router.post('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), createReview);
router.put('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), updateReview);
router.put('/:id/acknowledge', authenticate, acknowledgeReview);

export default router;
