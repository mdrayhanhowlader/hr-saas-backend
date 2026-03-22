import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const getDevices = async (req: AuthRequest, res: Response) => {
  try {
    const devices = await prisma.biometricDevice.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return sendSuccess(res, 'Devices fetched', devices);
  } catch (error) {
    return sendError(res, 'Failed to fetch devices', 500);
  }
};

export const addDevice = async (req: AuthRequest, res: Response) => {
  try {
    const { name, deviceId, type, location, ipAddress } = req.body;
    if (!name || !deviceId) return sendError(res, 'Name and Device ID are required');

    const existing = await prisma.biometricDevice.findUnique({ where: { deviceId } });
    if (existing) return sendError(res, 'Device ID already registered');

    const device = await prisma.biometricDevice.create({
      data: { tenantId: req.user!.tenantId, name, deviceId, type, location, ipAddress }
    });
    return sendSuccess(res, 'Device registered', device, 201);
  } catch (error) {
    return sendError(res, 'Failed to add device', 500);
  }
};

export const deleteDevice = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const device = await prisma.biometricDevice.findFirst({
      where: { id, tenantId: req.user!.tenantId }
    });
    if (!device) return sendError(res, 'Device not found', 404);

    await prisma.biometricDevice.delete({ where: { id } });
    return sendSuccess(res, 'Device removed');
  } catch (error) {
    return sendError(res, 'Failed to remove device', 500);
  }
};
