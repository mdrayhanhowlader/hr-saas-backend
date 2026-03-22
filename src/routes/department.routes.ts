import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/department.controller';

const router = Router();

router.get('/', authenticate, getDepartments);
router.post('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), createDepartment);
router.put('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), updateDepartment);
router.delete('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), deleteDepartment);

export default router;
