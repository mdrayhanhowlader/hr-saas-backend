import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const getDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      where: { tenantId: req.user!.tenantId, isActive: true },
      include: {
        _count: { select: { employees: true } }
      },
      orderBy: { name: 'asc' }
    });
    return sendSuccess(res, 'Departments fetched', departments);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return sendError(res, 'Name required');

    const existing = await prisma.department.findFirst({
      where: { tenantId: req.user!.tenantId, name, isActive: true }
    });
    if (existing) return sendError(res, 'Department already exists');

    const dept = await prisma.department.create({
      data: { tenantId: req.user!.tenantId, name, description }
    });
    return sendSuccess(res, 'Department created', dept, 201);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, description } = req.body;

    const dept = await prisma.department.findFirst({
      where: { id, tenantId: req.user!.tenantId }
    });
    if (!dept) return sendError(res, 'Department not found', 404);

    const updated = await prisma.department.update({
      where: { id },
      data: { name, description }
    });
    return sendSuccess(res, 'Department updated', updated);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const dept = await prisma.department.findFirst({
      where: { id, tenantId: req.user!.tenantId }
    });
    if (!dept) return sendError(res, 'Department not found', 404);

    const empCount = await prisma.employee.count({
      where: { departmentId: id, employmentStatus: 'ACTIVE' }
    });
    if (empCount > 0) return sendError(res, `Cannot delete — ${empCount} active employees in this department`);

    await prisma.department.update({ where: { id }, data: { isActive: false } });
    return sendSuccess(res, 'Department deleted');
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};
