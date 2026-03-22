import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const getTenant = async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
    });
    if (!tenant) return sendError(res, 'Company not found', 404);
    return sendSuccess(res, 'Company fetched', tenant);
  } catch { return sendError(res, 'Failed', 500); }
};

export const updateTenant = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, address, industry, size, timezone, currency, fiscalYear, logo, employeeFormConfig } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.user!.tenantId },
      data: { name, phone, address, industry, size, timezone, currency, fiscalYear, logo }
    });
    return sendSuccess(res, 'Company updated', tenant);
  } catch { return sendError(res, 'Failed', 500); }
};
