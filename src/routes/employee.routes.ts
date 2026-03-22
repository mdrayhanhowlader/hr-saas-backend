import { Router } from 'express';
import { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, getEmployeeStats } from '../controllers/employee.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticate, getEmployeeStats);
router.get('/', authenticate, getEmployees);
router.get('/:id', authenticate, getEmployee);
router.post('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), createEmployee);
router.put('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), updateEmployee);
router.delete('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), deleteEmployee);

export default router;
