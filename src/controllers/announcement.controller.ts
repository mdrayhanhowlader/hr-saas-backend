import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const getAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { tenantId: req.user!.tenantId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    return sendSuccess(res, 'Announcements fetched', announcements);
  } catch {
    return sendError(res, 'Failed to fetch announcements', 500);
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, priority } = req.body;
    if (!title || !content) return sendError(res, 'Title and content are required');

    const ann = await prisma.announcement.create({
      data: { tenantId: req.user!.tenantId, title, content, priority: priority || 'normal' }
    });
    return sendSuccess(res, 'Announcement created', ann, 201);
  } catch {
    return sendError(res, 'Failed to create announcement', 500);
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.announcement.update({ where: { id }, data: { isActive: false } });
    return sendSuccess(res, 'Announcement deleted');
  } catch {
    return sendError(res, 'Failed to delete announcement', 500);
  }
};
