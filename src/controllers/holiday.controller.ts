import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

const BANGLADESH_HOLIDAYS_2026 = [
  { name: 'New Year Day', date: '2026-01-01', type: 'public' },
  { name: 'International Mother Language Day', date: '2026-02-21', type: 'public' },
  { name: 'Independence Day', date: '2026-03-26', type: 'public' },
  { name: 'Bengali New Year', date: '2026-04-14', type: 'public' },
  { name: 'May Day', date: '2026-05-01', type: 'public' },
  { name: 'National Mourning Day', date: '2026-08-15', type: 'public' },
  { name: 'Victory Day', date: '2026-12-16', type: 'public' },
  { name: 'Christmas Day', date: '2026-12-25', type: 'public' },
];

export const getHolidays = async (req: AuthRequest, res: Response) => {
  try {
    const { year } = req.query;
    const filterYear = year ? Number(year) : new Date().getFullYear();

    const holidays = await prisma.holiday.findMany({
      where: {
        tenantId: req.user!.tenantId,
        date: {
          gte: new Date(`${filterYear}-01-01`),
          lte: new Date(`${filterYear}-12-31`),
        }
      },
      orderBy: { date: 'asc' }
    });

    return sendSuccess(res, 'Holidays fetched', holidays);
  } catch (error) {
    return sendError(res, 'Failed to fetch holidays', 500);
  }
};

export const createHoliday = async (req: AuthRequest, res: Response) => {
  try {
    const { name, date, type } = req.body;
    if (!name || !date) return sendError(res, 'Name and date are required');

    const holiday = await prisma.holiday.create({
      data: {
        tenantId: req.user!.tenantId,
        name,
        date: new Date(date),
        type: type || 'public',
      }
    });

    return sendSuccess(res, 'Holiday created', holiday, 201);
  } catch (error) {
    return sendError(res, 'Failed to create holiday', 500);
  }
};

export const deleteHoliday = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const holiday = await prisma.holiday.findFirst({
      where: { id, tenantId: req.user!.tenantId }
    });
    if (!holiday) return sendError(res, 'Holiday not found', 404);

    await prisma.holiday.delete({ where: { id } });
    return sendSuccess(res, 'Holiday deleted');
  } catch (error) {
    return sendError(res, 'Failed to delete holiday', 500);
  }
};

export const importDefaultHolidays = async (req: AuthRequest, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    let created = 0;

    for (const h of BANGLADESH_HOLIDAYS_2026) {
      const dateWithYear = h.date.replace('2026', String(year));
      const existing = await prisma.holiday.findFirst({
        where: { tenantId: req.user!.tenantId, date: new Date(dateWithYear) }
      });
      if (!existing) {
        await prisma.holiday.create({
          data: {
            tenantId: req.user!.tenantId,
            name: h.name,
            date: new Date(dateWithYear),
            type: h.type,
          }
        });
        created++;
      }
    }

    return sendSuccess(res, `Imported ${created} holidays`, { created });
  } catch (error) {
    return sendError(res, 'Failed to import holidays', 500);
  }
};
