import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { createNotification } from '../utils/notification';

export const getReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, year, employeeId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const employees = await prisma.employee.findMany({
      where: { tenantId: req.user!.tenantId },
      select: { id: true }
    });
    const empIds = employees.map(e => e.id);

    const where: any = { employeeId: { in: empIds } };
    if (year) where.year = Number(year);
    if (employeeId) where.employeeId = String(employeeId);

    const [reviews, total] = await Promise.all([
      prisma.performanceReview.findMany({
        where, skip, take: Number(limit),
        include: {
          employee: {
            select: {
              firstName: true, lastName: true,
              employeeId: true, photo: true,
              department: { select: { name: true } },
              designation: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.performanceReview.count({ where })
    ]);

    return sendSuccess(res, 'Reviews fetched', reviews, 200, {
      page: Number(page), limit: Number(limit), total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch reviews', 500);
  }
};

export const getMyReviews = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { userId: req.user!.id }
    });
    if (!employee) return sendSuccess(res, 'No reviews', []);

    const reviews = await prisma.performanceReview.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' }
    });
    return sendSuccess(res, 'Reviews fetched', reviews);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, period, year, rating, goals, achievements, improvements, comments } = req.body;
    if (!employeeId || !period || !year || rating === undefined) {
      return sendError(res, 'Employee, period, year and rating are required');
    }
    if (rating < 1 || rating > 5) return sendError(res, 'Rating must be between 1 and 5');

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId: req.user!.tenantId },
      include: { user: true }
    });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const review = await prisma.performanceReview.create({
      data: {
        employeeId, reviewerId: req.user!.id,
        period, year: Number(year), rating: Number(rating),
        goals: goals || null, achievements: achievements || null,
        improvements: improvements || null, comments: comments || null,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        employee: { select: { firstName: true, lastName: true } }
      }
    });

    if (employee.user) {
      await createNotification({
        tenantId: req.user!.tenantId,
        userId: employee.user.id,
        title: 'Performance Review Submitted',
        message: `Your performance review for ${period} ${year} has been submitted. Rating: ${rating}/5`,
        type: rating >= 4 ? 'success' : rating >= 3 ? 'info' : 'warning',
        link: '/my-profile',
      });
    }

    return sendSuccess(res, 'Review created', review, 201);
  } catch (error) {
    return sendError(res, 'Failed to create review', 500);
  }
};

export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { rating, goals, achievements, improvements, comments, status } = req.body;

    const review = await prisma.performanceReview.findUnique({
      where: { id },
      include: { employee: { include: { user: true } } }
    });
    if (!review) return sendError(res, 'Review not found', 404);

    const updated = await prisma.performanceReview.update({
      where: { id },
      data: {
        rating: rating !== undefined ? Number(rating) : undefined,
        goals, achievements, improvements, comments,
        status,
        submittedAt: status === 'SUBMITTED' ? new Date() : undefined,
      }
    });

    if (status === 'ACKNOWLEDGED' && review.employee.user) {
      await createNotification({
        tenantId: review.employee.tenantId,
        userId: review.employee.user.id,
        title: 'Review Acknowledged',
        message: `Your performance review for ${review.period} ${review.year} has been acknowledged`,
        type: 'success',
        link: '/my-profile',
      });
    }

    return sendSuccess(res, 'Review updated', updated);
  } catch (error) {
    return sendError(res, 'Failed to update review', 500);
  }
};

export const acknowledgeReview = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const employee = await prisma.employee.findFirst({ where: { userId: req.user!.id } });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const review = await prisma.performanceReview.findFirst({
      where: { id, employeeId: employee.id }
    });
    if (!review) return sendError(res, 'Review not found', 404);

    const updated = await prisma.performanceReview.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED' }
    });

    return sendSuccess(res, 'Review acknowledged', updated);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};
