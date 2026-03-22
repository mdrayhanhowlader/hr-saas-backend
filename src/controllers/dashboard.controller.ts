import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { startOfDay, startOfMonth, endOfMonth } from 'date-fns';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const today = startOfDay(new Date());
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [
      totalEmployees, activeEmployees,
      presentToday, onLeaveToday,
      pendingLeaves, openJobs,
      monthPayroll, recentEmployees,
      announcements,
    ] = await Promise.all([
      prisma.employee.count({ where: { tenantId } }),
      prisma.employee.count({ where: { tenantId, employmentStatus: 'ACTIVE' } }),
      prisma.attendance.count({ where: { tenantId, date: today, status: { in: ['PRESENT', 'LATE'] } } }),
      prisma.attendance.count({ where: { tenantId, date: today, status: 'ON_LEAVE' } }),
      prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.jobPosting.count({ where: { tenantId, status: 'OPEN' } }),
      prisma.payroll.aggregate({
        where: { tenantId, createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { netSalary: true, grossSalary: true }
      }),
      prisma.employee.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { firstName: true, lastName: true, designation: true, department: true, photo: true, createdAt: true }
      }),
      prisma.announcement.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    return sendSuccess(res, 'Dashboard stats fetched', {
      overview: { totalEmployees, activeEmployees, presentToday, onLeaveToday, pendingLeaves, openJobs },
      payroll: { totalNet: monthPayroll._sum.netSalary || 0, totalGross: monthPayroll._sum.grossSalary || 0 },
      recentEmployees,
      announcements,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch dashboard stats', 500);
  }
};
