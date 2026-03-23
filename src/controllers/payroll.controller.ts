import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { startOfMonth, endOfMonth } from 'date-fns';

export const getPayrolls = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, month, year, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const now = new Date();
    const where: any = {
      tenantId: req.user!.tenantId,
      month: month ? Number(month) : now.getMonth() + 1,
      year: year ? Number(year) : now.getFullYear(),
    };
    if (status) where.status = String(status);

    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where, skip, take: Number(limit),
        include: {
          employee: {
            select: {
              firstName: true, lastName: true,
              employeeId: true, photo: true, designation: true,
              bankName: true, bankAccount: true,
              department: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payroll.count({ where })
    ]);

    return sendSuccess(res, 'Payrolls fetched', payrolls, 200, {
      page: Number(page), limit: Number(limit), total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch payrolls', 500);
  }
};

export const generatePayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return sendError(res, 'Month and year are required');

    const employees = await prisma.employee.findMany({
      where: { tenantId: req.user!.tenantId, employmentStatus: 'ACTIVE' }
    });

    if (employees.length === 0) return sendError(res, 'No active employees found');

    const startDate = startOfMonth(new Date(Number(year), Number(month) - 1));
    const endDate = endOfMonth(new Date(Number(year), Number(month) - 1));
    const workingDays = 26;
    const payrolls = [];
    const skipped = [];

    for (const emp of employees) {
      const existing = await prisma.payroll.findFirst({
        where: { employeeId: emp.id, month: Number(month), year: Number(year) }
      });
      if (existing) { skipped.push(emp.employeeId); continue; }

      const originalBasic = Number(emp.basicSalary);

      if (originalBasic === 0) {
        const payroll = await prisma.payroll.create({
          data: {
            tenantId: req.user!.tenantId,
            employeeId: emp.id,
            month: Number(month),
            year: Number(year),
            basicSalary: 0,
            houseAllowance: 0,
            medicalAllowance: 0,
            transportAllowance: 0,
            otherAllowance: 0,
            grossSalary: 0,
            taxDeduction: 0,
            providentFund: 0,
            otherDeduction: 0,
            totalDeduction: 0,
            netSalary: 0,
            workingDays,
            presentDays: 0,
            absentDays: 0,
            overtimeHours: 0,
            overtimePay: 0,
          }
        });
        payrolls.push(payroll);
        continue;
      }

      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: startDate, lte: endDate },
        }
      });

      const markedDays = attendances.length;
      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let overtimeHours = 0;

      if (markedDays === 0) {
        presentDays = workingDays;
        absentDays = 0;
      } else {
        presentDays = attendances.filter(a => ['PRESENT', 'LATE'].includes(a.status)).length;
        halfDays = attendances.filter(a => a.status === 'HALF_DAY').length;
        const onLeave = attendances.filter(a => a.status === 'ON_LEAVE').length;
        const markedAbsent = attendances.filter(a => a.status === 'ABSENT').length;
        const effectivePresent = presentDays + (halfDays * 0.5) + onLeave;
        absentDays = Math.max(0, markedAbsent);
        presentDays = Math.round(effectivePresent);

        overtimeHours = attendances.reduce((sum, a) => {
          if (a.workHours && Number(a.workHours) > 8) {
            return sum + (Number(a.workHours) - 8);
          }
          return sum;
        }, 0);
      }

      const earnedBasic = originalBasic;

      const houseAllowance = earnedBasic * 0.4;
      const medicalAllowance = earnedBasic * 0.1;
      const transportAllowance = earnedBasic * 0.1;
      const grossSalary = earnedBasic + houseAllowance + medicalAllowance + transportAllowance;

      const annualGross = grossSalary * 12;
      const taxDeduction = annualGross > 350000 ? Math.round(grossSalary * 0.1 * 100) / 100 : 0;
      const providentFund = Math.round(originalBasic * 0.05 * 100) / 100;
      const totalDeduction = taxDeduction + providentFund;

      const overtimePay = overtimeHours > 0
        ? Math.round((originalBasic / workingDays / 8) * overtimeHours * 1.5 * 100) / 100
        : 0;

      const netSalary = Math.max(0, grossSalary - totalDeduction + overtimePay);

      const payroll = await prisma.payroll.create({
        data: {
          tenantId: req.user!.tenantId,
          employeeId: emp.id,
          month: Number(month),
          year: Number(year),
          basicSalary: Math.round(earnedBasic * 100) / 100,
          houseAllowance: Math.round(houseAllowance * 100) / 100,
          medicalAllowance: Math.round(medicalAllowance * 100) / 100,
          transportAllowance: Math.round(transportAllowance * 100) / 100,
          otherAllowance: 0,
          grossSalary: Math.round(grossSalary * 100) / 100,
          taxDeduction,
          providentFund,
          otherDeduction: 0,
          totalDeduction: Math.round(totalDeduction * 100) / 100,
          netSalary: Math.round(netSalary * 100) / 100,
          workingDays,
          presentDays,
          absentDays,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          overtimePay,
        },
        include: {
          employee: { select: { firstName: true, lastName: true, employeeId: true } }
        }
      });
      payrolls.push(payroll);
    }

    return sendSuccess(
      res,
      `Payroll generated for ${payrolls.length} employees${skipped.length > 0 ? `, ${skipped.length} skipped (already exists)` : ''}`,
      { payrolls, skipped }
    );
  } catch (error) {
    console.error('Payroll generate error:', error);
    return sendError(res, 'Failed to generate payroll', 500);
  }
};

export const getMyPayslips = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await prisma.employee.findFirst({ where: { userId: req.user!.id } });
    if (!employee) return sendSuccess(res, 'No payslips', []);

    const payslips = await prisma.payroll.findMany({
      where: { employeeId: employee.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    return sendSuccess(res, 'Payslips fetched', payslips);
  } catch (error) {
    return sendError(res, 'Failed to fetch payslips', 500);
  }
};

export const updatePayrollStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, paymentMethod, transactionId, note } = req.body;

    const payroll = await prisma.payroll.findFirst({
      where: { id, tenantId: req.user!.tenantId }
    });
    if (!payroll) return sendError(res, 'Payroll not found', 404);

    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        status,
        paidAt: status === 'PAID' ? new Date() : undefined,
        paymentMethod: paymentMethod || undefined,
        transactionId: transactionId || undefined,
        note: note || undefined,
      }
    });
    return sendSuccess(res, 'Payroll status updated', updated);
  } catch (error) {
    return sendError(res, 'Failed to update payroll status', 500);
  }
};

export const bulkUpdatePayrollStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { ids, status, paymentMethod } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return sendError(res, 'IDs are required');

    await prisma.payroll.updateMany({
      where: { id: { in: ids }, tenantId: req.user!.tenantId },
      data: {
        status,
        paidAt: status === 'PAID' ? new Date() : undefined,
        paymentMethod: paymentMethod || undefined,
      }
    });

    return sendSuccess(res, `${ids.length} payrolls updated to ${status}`);
  } catch (error) {
    return sendError(res, 'Failed to bulk update', 500);
  }
};

export const getPayrollStats = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    const payrolls = await prisma.payroll.findMany({
      where: { tenantId: req.user!.tenantId, month, year }
    });

    const totalGross = payrolls.reduce((sum, p) => sum + Number(p.grossSalary), 0);
    const totalNet = payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0);
    const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.totalDeduction), 0);
    const totalOvertimePay = payrolls.reduce((sum, p) => sum + Number(p.overtimePay), 0);
    const paid = payrolls.filter(p => p.status === 'PAID').length;
    const pending = payrolls.filter(p => p.status !== 'PAID').length;

    return sendSuccess(res, 'Payroll stats fetched', {
      totalEmployees: payrolls.length,
      totalGross: Math.round(totalGross),
      totalNet: Math.round(totalNet),
      totalDeductions: Math.round(totalDeductions),
      totalOvertimePay: Math.round(totalOvertimePay),
      paid,
      pending,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch stats', 500);
  }
};

export const getPayslipData = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const payroll = await prisma.payroll.findFirst({
      where: { id, tenantId: req.user!.tenantId },
      include: {
        employee: {
          include: { department: true }
        }
      }
    });
    if (!payroll) return sendError(res, 'Payroll not found', 404);

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId }
    });

    return sendSuccess(res, 'Payslip data fetched', { payroll, company: tenant });
  } catch (error) {
    return sendError(res, 'Failed to fetch payslip', 500);
  }
};
