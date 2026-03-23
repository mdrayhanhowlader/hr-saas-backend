import { Response, Request } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { startOfDay, startOfMonth, endOfMonth } from 'date-fns';

export const checkIn = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { userId: req.user!.id, tenantId: req.user!.tenantId }
    });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const today = new Date();
    const todayDate = startOfDay(today);
    const existing = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, date: todayDate }
    });

    if (existing?.checkIn) return sendError(res, 'Already checked in today');

    const officeStart = new Date(today);
    officeStart.setHours(9, 0, 0, 0);
    const status = today > officeStart ? 'LATE' : 'PRESENT';

    if (existing) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { checkIn: today, source: 'WEB' }
      });
      return sendSuccess(res, 'Checked in successfully', updated);
    }

    const attendance = await prisma.attendance.create({
      data: {
        tenantId: req.user!.tenantId,
        employeeId: employee.id,
        date: todayDate,
        checkIn: today,
        status,
        source: 'WEB',
      }
    });
    return sendSuccess(res, 'Checked in successfully', attendance, 201);
  } catch (error) {
    return sendError(res, 'Check-in failed', 500);
  }
};

export const checkOut = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { userId: req.user!.id, tenantId: req.user!.tenantId }
    });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const todayDate = startOfDay(new Date());
    const attendance = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, date: todayDate }
    });

    if (!attendance) return sendError(res, 'No check-in found for today');
    if (attendance.checkOut) return sendError(res, 'Already checked out today');

    const checkOut = new Date();
    const workHours = attendance.checkIn
      ? (checkOut.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60)
      : 0;

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOut, workHours: Math.round(workHours * 100) / 100 }
    });
    return sendSuccess(res, 'Checked out successfully', updated);
  } catch (error) {
    return sendError(res, 'Check-out failed', 500);
  }
};

export const biometricPunch = async (req: Request, res: Response) => {
  try {
    const { deviceId, biometricId, punchTime, punchType } = req.body;

    const device = await prisma.biometricDevice.findUnique({ where: { deviceId } });
    if (!device) return sendError(res, 'Device not registered', 403);

    const employee = await prisma.employee.findFirst({
      where: { biometricId, tenantId: device.tenantId }
    });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const punchDate = punchTime ? new Date(punchTime) : new Date();
    const dateOnly = startOfDay(punchDate);
    const existing = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, date: dateOnly }
    });

    if (!existing || punchType === 'IN') {
      if (!existing) {
        const officeStart = new Date(punchDate);
        officeStart.setHours(9, 0, 0, 0);
        const status = punchDate > officeStart ? 'LATE' : 'PRESENT';
        await prisma.attendance.create({
          data: {
            tenantId: device.tenantId,
            employeeId: employee.id,
            date: dateOnly,
            checkIn: punchDate,
            status,
            source: 'BIOMETRIC',
            deviceId,
          }
        });
      }
    } else {
      const workHours = existing.checkIn
        ? (punchDate.getTime() - existing.checkIn.getTime()) / (1000 * 60 * 60)
        : 0;
      await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOut: punchDate,
          workHours: Math.round(workHours * 100) / 100,
          source: 'BIOMETRIC',
          deviceId,
        }
      });
      await prisma.biometricDevice.update({
        where: { deviceId },
        data: { lastSync: new Date() }
      });
    }
    return sendSuccess(res, 'Punch recorded successfully');
  } catch (error) {
    return sendError(res, 'Biometric punch failed', 500);
  }
};

export const getAttendances = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, employeeId, month, year } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const now = new Date();
    const filterMonth = month ? Number(month) - 1 : now.getMonth();
    const filterYear = year ? Number(year) : now.getFullYear();
    const startDate = startOfMonth(new Date(filterYear, filterMonth));
    const endDate = endOfMonth(new Date(filterYear, filterMonth));

    const where: any = {
      tenantId: req.user!.tenantId,
      date: { gte: startDate, lte: endDate }
    };
    if (employeeId) where.employeeId = String(employeeId);

    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where, skip, take: Number(limit),
        include: { employee: { select: { firstName: true, lastName: true, employeeId: true, photo: true } } },
        orderBy: { date: 'desc' }
      }),
      prisma.attendance.count({ where })
    ]);

    return sendSuccess(res, 'Attendances fetched successfully', attendances, 200, {
      page: Number(page), limit: Number(limit), total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch attendances', 500);
  }
};

export const getMyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await prisma.employee.findFirst({ where: { userId: req.user!.id } });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const { month, year } = req.query;
    const now = new Date();
    const filterMonth = month ? Number(month) - 1 : now.getMonth();
    const filterYear = year ? Number(year) : now.getFullYear();
    const startDate = startOfMonth(new Date(filterYear, filterMonth));
    const endDate = endOfMonth(new Date(filterYear, filterMonth));

    const attendances = await prisma.attendance.findMany({
      where: { employeeId: employee.id, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' }
    });

    const todayAttendance = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, date: startOfDay(new Date()) }
    });

    return sendSuccess(res, 'Attendance fetched successfully', { attendances, today: todayAttendance });
  } catch (error) {
    return sendError(res, 'Failed to fetch attendance', 500);
  }
};

export const updateAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { checkIn, checkOut, status, note } = req.body;

    const attendance = await prisma.attendance.findFirst({
      where: { id, tenantId: req.user!.tenantId }
    });
    if (!attendance) return sendError(res, 'Attendance not found', 404);

    let workHours = attendance.workHours;
    if (checkIn && checkOut) {
      const diff = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60);
      workHours = Math.round(diff * 100) / 100 as any;
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        status, note, workHours,
      }
    });
    return sendSuccess(res, 'Attendance updated successfully', updated);
  } catch (error) {
    return sendError(res, 'Failed to update attendance', 500);
  }
};

export const getAttendanceStats = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const today = startOfDay(new Date());

    const [presentToday, lateToday, absentToday, totalEmployees] = await Promise.all([
      prisma.attendance.count({ where: { tenantId, date: today, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { tenantId, date: today, status: 'LATE' } }),
      prisma.attendance.count({ where: { tenantId, date: today, status: 'ABSENT' } }),
      prisma.employee.count({ where: { tenantId, employmentStatus: 'ACTIVE' } }),
    ]);

    return sendSuccess(res, 'Stats fetched', {
      presentToday, lateToday, absentToday, totalEmployees,
      notMarked: totalEmployees - presentToday - lateToday - absentToday,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch stats', 500);
  }
};

export const manualAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, note } = req.body;
    if (!employeeId || !date) return sendError(res, 'Employee and date are required');

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId: req.user!.tenantId }
    });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const dateOnly = startOfDay(new Date(date));

    const existing = await prisma.attendance.findFirst({
      where: { employeeId, date: dateOnly }
    });

    let workHours = null;
    if (checkIn && checkOut) {
      const diff = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60);
      workHours = Math.round(diff * 100) / 100;
    }

    if (existing) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkIn: checkIn ? new Date(checkIn) : existing.checkIn,
          checkOut: checkOut ? new Date(checkOut) : existing.checkOut,
          status: status || existing.status,
          note,
          workHours: workHours as any,
          source: 'MANUAL',
        }
      });
      return sendSuccess(res, 'Attendance updated', updated);
    }

    const attendance = await prisma.attendance.create({
      data: {
        tenantId: req.user!.tenantId,
        employeeId,
        date: dateOnly,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || 'PRESENT',
        note,
        workHours: workHours as any,
        source: 'MANUAL',
      }
    });
    return sendSuccess(res, 'Attendance created', attendance, 201);
  } catch (error) {
    return sendError(res, 'Failed to save attendance', 500);
  }
};

export const manualAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, note } = req.body;
    if (!employeeId || !date || !status) {
      return sendError(res, 'Employee, date and status are required');
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId: req.user!.tenantId }
    });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const checkInTime = checkIn ? new Date(`${date}T${checkIn}:00`) : null;
    const checkOutTime = checkOut ? new Date(`${date}T${checkOut}:00`) : null;

    let workHours = null;
    if (checkInTime && checkOutTime) {
      workHours = ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2);
    }

    const existing = await prisma.attendance.findFirst({
      where: { employeeId, date: attendanceDate }
    });

    let attendance;
    if (existing) {
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status, checkIn: checkInTime, checkOut: checkOutTime, workHours, note, source: 'MANUAL' }
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          tenantId: req.user!.tenantId,
          employeeId,
          date: attendanceDate,
          status,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          workHours,
          note,
          source: 'MANUAL',
        }
      });
    }

    return sendSuccess(res, existing ? 'Attendance updated' : 'Attendance created', attendance);
  } catch (error) {
    console.error('Manual attendance error:', error);
    return sendError(res, 'Failed to save attendance', 500);
  }
};
