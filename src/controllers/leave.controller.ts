import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { createNotification, notifyAllAdmins } from '../utils/notification';

const getOrCreateEmployeeForUser = async (userId: string, tenantId: string) => {
  let employee = await prisma.employee.findFirst({ where: { userId } });
  if (employee) return employee;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const count = await prisma.employee.count({ where: { tenantId } });
  const employeeId = `EMP${String(count + 1).padStart(4, '0')}`;

  employee = await prisma.employee.create({
    data: {
      tenantId, userId, employeeId,
      firstName: user.email.split('@')[0],
      lastName: '', email: user.email,
      joiningDate: new Date(), basicSalary: 0,
    }
  });
  return employee;
};

export const getLeaveTypes = async (req: AuthRequest, res: Response) => {
  try {
    const leaveTypes = await prisma.leaveType.findMany({
      where: { tenantId: req.user!.tenantId, isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    return sendSuccess(res, 'Leave types fetched', leaveTypes);
  } catch (error) {
    return sendError(res, 'Failed to fetch leave types', 500);
  }
};

export const createLeaveType = async (req: AuthRequest, res: Response) => {
  try {
    const { name, daysAllowed, isPaid, carryForward, maxCarryDays } = req.body;
    if (!name || !daysAllowed) return sendError(res, 'Name and days allowed are required');

    const existing = await prisma.leaveType.findFirst({
      where: { tenantId: req.user!.tenantId, name, isActive: true }
    });
    if (existing) return sendError(res, 'Leave type with this name already exists');

    const leaveType = await prisma.leaveType.create({
      data: {
        tenantId: req.user!.tenantId,
        name, daysAllowed: Number(daysAllowed),
        isPaid: isPaid !== false,
        carryForward: carryForward || false,
        maxCarryDays: maxCarryDays || 0,
      }
    });

    const employees = await prisma.employee.findMany({
      where: { tenantId: req.user!.tenantId, employmentStatus: 'ACTIVE' }
    });

    const year = new Date().getFullYear();
    if (employees.length > 0) {
      await prisma.leaveBalance.createMany({
        data: employees.map(emp => ({
          employeeId: emp.id, leaveTypeId: leaveType.id,
          year, allocated: Number(daysAllowed), used: 0, remaining: Number(daysAllowed),
        })),
        skipDuplicates: true,
      });
    }

    return sendSuccess(res, 'Leave type created', leaveType, 201);
  } catch (error) {
    return sendError(res, 'Failed to create leave type', 500);
  }
};

export const getLeaveRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, employeeId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId: req.user!.tenantId };
    if (status) where.status = String(status);
    if (employeeId) where.employeeId = String(employeeId);

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where, skip, take: Number(limit),
        include: {
          employee: {
            select: {
              firstName: true, lastName: true,
              employeeId: true, photo: true,
              department: { select: { name: true } }
            }
          },
          leaveType: true,
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.leaveRequest.count({ where })
    ]);

    return sendSuccess(res, 'Leave requests fetched', requests, 200, {
      page: Number(page), limit: Number(limit), total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch leave requests', 500);
  }
};

export const getMyLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await getOrCreateEmployeeForUser(req.user!.id, req.user!.tenantId);
    if (!employee) return sendSuccess(res, 'No employee record', []);

    const requests = await prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' }
    });
    return sendSuccess(res, 'Leave requests fetched', requests);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const getLeaveBalances = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await getOrCreateEmployeeForUser(req.user!.id, req.user!.tenantId);
    if (!employee) return sendSuccess(res, 'No employee record', []);

    const year = new Date().getFullYear();
    const leaveTypes = await prisma.leaveType.findMany({
      where: { tenantId: req.user!.tenantId, isActive: true }
    });

    if (leaveTypes.length === 0) return sendSuccess(res, 'No leave types', []);

    const existingBalances = await prisma.leaveBalance.findMany({
      where: { employeeId: employee.id, year },
      include: { leaveType: true }
    });

    const missingTypes = leaveTypes.filter(
      lt => !existingBalances.find(b => b.leaveTypeId === lt.id)
    );

    if (missingTypes.length > 0) {
      await prisma.leaveBalance.createMany({
        data: missingTypes.map(lt => ({
          employeeId: employee.id, leaveTypeId: lt.id,
          year, allocated: lt.daysAllowed, used: 0, remaining: lt.daysAllowed,
        })),
        skipDuplicates: true,
      });
    }

    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId: employee.id, year },
      include: { leaveType: true },
      orderBy: { createdAt: 'asc' }
    });

    return sendSuccess(res, 'Leave balances fetched', balances);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const createLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { leaveTypeId, startDate, endDate, reason } = req.body;
    if (!leaveTypeId || !startDate || !endDate) {
      return sendError(res, 'Leave type, start date and end date are required');
    }

    const employee = await getOrCreateEmployeeForUser(req.user!.id, req.user!.tenantId);
    if (!employee) return sendError(res, 'Could not find employee record', 500);

    const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType) return sendError(res, 'Leave type not found', 404);

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return sendError(res, 'End date cannot be before start date');

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const year = start.getFullYear();

    let balance = await prisma.leaveBalance.findFirst({
      where: { employeeId: employee.id, leaveTypeId, year }
    });

    if (!balance) {
      balance = await prisma.leaveBalance.create({
        data: {
          employeeId: employee.id, leaveTypeId, year,
          allocated: leaveType.daysAllowed, used: 0, remaining: leaveType.daysAllowed,
        }
      });
    }

    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      }
    });
    if (overlapping) return sendError(res, 'You already have a leave request overlapping these dates');

    const request = await prisma.leaveRequest.create({
      data: {
        tenantId: req.user!.tenantId,
        employeeId: employee.id,
        leaveTypeId, startDate: start, endDate: end,
        totalDays, reason: reason || null,
      },
      include: { leaveType: true }
    });

    await notifyAllAdmins(
      req.user!.tenantId,
      'New Leave Request',
      `${employee.firstName} ${employee.lastName} applied for ${leaveType.name} (${totalDays} day${totalDays > 1 ? 's' : ''})`,
      'info',
      '/leaves'
    );

    return sendSuccess(res, 'Leave request submitted successfully', request, 201);
  } catch (error) {
    console.error('Leave request error:', error);
    return sendError(res, 'Failed to submit leave request', 500);
  }
};

export const updateLeaveStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, rejectNote, overrideBalance } = req.body;
    if (!status) return sendError(res, 'Status is required');

    const request = await prisma.leaveRequest.findFirst({
      where: { id, tenantId: req.user!.tenantId },
      include: { leaveType: true, employee: true }
    });
    if (!request) return sendError(res, 'Leave request not found', 404);
    if (request.status !== 'PENDING') {
      return sendError(res, `Request is already ${request.status.toLowerCase()}`);
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: status === 'APPROVED' ? req.user!.id : undefined,
        approvedAt: status === 'APPROVED' ? new Date() : undefined,
        rejectedBy: status === 'REJECTED' ? req.user!.id : undefined,
        rejectedAt: status === 'REJECTED' ? new Date() : undefined,
        rejectNote: status === 'REJECTED' ? rejectNote : undefined,
      }
    });

    if (status === 'APPROVED' && !overrideBalance) {
      const year = new Date(request.startDate).getFullYear();
      const balance = await prisma.leaveBalance.findFirst({
        where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year }
      });
      if (balance) {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            used: { increment: request.totalDays },
            remaining: Math.max(0, balance.remaining - request.totalDays),
          }
        });
      }
    }

    const employeeUser = await prisma.user.findUnique({
      where: { id: request.employee.userId }
    });

    if (employeeUser) {
      await createNotification({
        tenantId: req.user!.tenantId,
        userId: employeeUser.id,
        title: status === 'APPROVED' ? '✓ Leave Approved' : '✗ Leave Rejected',
        message: status === 'APPROVED'
          ? `Your ${request.leaveType.name} request for ${request.totalDays} day(s) has been approved${overrideBalance ? ' (special consideration)' : ''}`
          : `Your ${request.leaveType.name} request was rejected${rejectNote ? `: ${rejectNote}` : ''}`,
        type: status === 'APPROVED' ? 'success' : 'error',
        link: '/leaves',
      });
    }

    return sendSuccess(res, `Leave request ${status.toLowerCase()}`, updated);
  } catch (error) {
    return sendError(res, 'Failed to update leave status', 500);
  }
};

export const initializeLeaveBalances = async (req: AuthRequest, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const [employees, leaveTypes] = await Promise.all([
      prisma.employee.findMany({ where: { tenantId: req.user!.tenantId, employmentStatus: 'ACTIVE' } }),
      prisma.leaveType.findMany({ where: { tenantId: req.user!.tenantId, isActive: true } })
    ]);

    let created = 0;
    for (const emp of employees) {
      for (const lt of leaveTypes) {
        const exists = await prisma.leaveBalance.findFirst({
          where: { employeeId: emp.id, leaveTypeId: lt.id, year }
        });
        if (!exists) {
          await prisma.leaveBalance.create({
            data: {
              employeeId: emp.id, leaveTypeId: lt.id,
              year, allocated: lt.daysAllowed, used: 0, remaining: lt.daysAllowed,
            }
          });
          created++;
        }
      }
    }

    return sendSuccess(res, `Initialized ${created} leave balances for ${year}`, { created, year });
  } catch (error) {
    return sendError(res, 'Failed to initialize balances', 500);
  }
};
