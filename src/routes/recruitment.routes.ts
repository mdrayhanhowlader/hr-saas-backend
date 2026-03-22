import { Router } from 'express';
import {
  getJobPostings, createJobPosting, updateJobPosting,
  getApplicants, addApplicant, updateApplicantStatus,
  getPublicJobs, getPublicJob,
} from '../controllers/recruitment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/public/jobs', getPublicJobs);
router.get('/public/jobs/:id', getPublicJob);
router.get('/jobs', authenticate, getJobPostings);
router.post('/jobs', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), createJobPosting);
router.put('/jobs/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), updateJobPosting);
router.get('/applicants', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), getApplicants);
router.post('/applicants', addApplicant);
router.put('/applicants/:id/status', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), updateApplicantStatus);

export default router;
