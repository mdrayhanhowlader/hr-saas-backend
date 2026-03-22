import { Response, Request } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const getPublicJobs = async (req: Request, res: Response) => {
  try {
    const { slug } = req.query;
    const where: any = { status: 'OPEN' };

    if (slug) {
      const tenant = await prisma.tenant.findFirst({ where: { slug: String(slug) } });
      if (!tenant) return sendSuccess(res, 'No jobs', []);
      where.tenantId = tenant.id;
    }

    const jobs = await prisma.jobPosting.findMany({
      where,
      select: {
        id: true, title: true, department: true, location: true,
        type: true, experience: true, salary: true,
        description: true, requirements: true, deadline: true,
        createdAt: true,
        _count: { select: { applicants: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'Public jobs fetched', jobs);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const getPublicJob = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const job = await prisma.jobPosting.findFirst({
      where: { id, status: 'OPEN' },
      select: {
        id: true, title: true, department: true, location: true,
        type: true, experience: true, salary: true,
        description: true, requirements: true, deadline: true,
        createdAt: true,
      }
    });
    if (!job) return sendError(res, 'Job not found', 404);
    return sendSuccess(res, 'Job fetched', job);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const getJobPostings = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (status) where.status = String(status);

    const jobs = await prisma.jobPosting.findMany({
      where,
      include: { _count: { select: { applicants: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return sendSuccess(res, 'Job postings fetched', jobs);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const createJobPosting = async (req: AuthRequest, res: Response) => {
  try {
    const { title, department, location, type, experience, salary, description, requirements, deadline } = req.body;
    if (!title || !description) return sendError(res, 'Title and description are required');

    const job = await prisma.jobPosting.create({
      data: {
        tenantId: req.user!.tenantId,
        title, department, location, type, experience, salary, description, requirements,
        deadline: deadline ? new Date(deadline) : null,
      }
    });
    return sendSuccess(res, 'Job posting created', job, 201);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const updateJobPosting = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const job = await prisma.jobPosting.findFirst({
      where: { id, tenantId: req.user!.tenantId }
    });
    if (!job) return sendError(res, 'Job not found', 404);

    const updated = await prisma.jobPosting.update({
      where: { id },
      data: req.body
    });
    return sendSuccess(res, 'Updated', updated);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const getApplicants = async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, status } = req.query;
    const where: any = { tenantId: req.user!.tenantId };
    if (jobId) where.jobId = String(jobId);
    if (status) where.status = String(status);

    const applicants = await prisma.applicant.findMany({
      where,
      include: { job: { select: { title: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return sendSuccess(res, 'Applicants fetched', applicants);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const addApplicant = async (req: Request, res: Response) => {
  try {
    const { jobId, firstName, lastName, email, phone, coverLetter, experience } = req.body;
    if (!jobId || !firstName || !lastName || !email) {
      return sendError(res, 'Job ID, name and email are required');
    }

    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'OPEN') return sendError(res, 'Job not found or closed', 404);

    const existing = await prisma.applicant.findFirst({
      where: { jobId, email }
    });
    if (existing) return sendError(res, 'You have already applied for this position');

    const applicant = await prisma.applicant.create({
      data: { tenantId: job.tenantId, jobId, firstName, lastName, email, phone, coverLetter, experience }
    });
    return sendSuccess(res, 'Application submitted successfully', applicant, 201);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const updateApplicantStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, interviewDate, note } = req.body;

    const applicant = await prisma.applicant.findFirst({
      where: { id, tenantId: req.user!.tenantId }
    });
    if (!applicant) return sendError(res, 'Applicant not found', 404);

    const updated = await prisma.applicant.update({
      where: { id },
      data: {
        status,
        interviewDate: interviewDate ? new Date(interviewDate) : undefined,
        note
      }
    });
    return sendSuccess(res, 'Status updated', updated);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};
