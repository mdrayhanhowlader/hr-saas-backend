import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.id, tenantId: req.user!.tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.notification.count({
        where: { userId: req.user!.id, tenantId: req.user!.tenantId }
      }),
      prisma.notification.count({
        where: { userId: req.user!.id, tenantId: req.user!.tenantId, isRead: false }
      }),
    ]);

    return sendSuccess(res, 'Notifications fetched', { notifications, unreadCount }, 200, {
      page: Number(page), limit: Number(limit), total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch notifications', 500);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.notification.updateMany({
      where: { id, userId: req.user!.id }
    ,
      data: { isRead: true }
    });
    return sendSuccess(res, 'Marked as read');
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, tenantId: req.user!.tenantId, isRead: false },
      data: { isRead: true }
    });
    return sendSuccess(res, 'All marked as read');
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.notification.deleteMany({
      where: { id, userId: req.user!.id }
    });
    return sendSuccess(res, 'Deleted');
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, tenantId: req.user!.tenantId, isRead: false }
    });
    return sendSuccess(res, 'Unread count', { count });
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};
