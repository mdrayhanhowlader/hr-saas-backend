import { prisma } from '../config/prisma';

interface CreateNotificationParams {
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

export const createNotification = async (params: CreateNotificationParams) => {
  try {
    return await prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        link: params.link || null,
      }
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

export const notifyAllAdmins = async (tenantId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', link?: string) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ['HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'] },
        isActive: true,
      }
    });
    for (const admin of admins) {
      await createNotification({ tenantId, userId: admin.id, title, message, type, link });
    }
  } catch (error) {
    console.error('Failed to notify admins:', error);
  }
};
