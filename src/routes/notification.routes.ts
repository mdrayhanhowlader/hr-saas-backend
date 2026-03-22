import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getNotifications, markAsRead, markAllAsRead,
  deleteNotification, getUnreadCount
} from '../controllers/notification.controller';

const router = Router();

router.get('/', authenticate, getNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.put('/mark-all-read', authenticate, markAllAsRead);
router.put('/:id/read', authenticate, markAsRead);
router.delete('/:id', authenticate, deleteNotification);

export default router;
