import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from '../utils/email';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const getEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search, department, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { tenantId: req.user!.tenantId };
    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { employeeId: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (department) where.departmentId = String(department);
    if (status) where.employmentStatus = String(status);

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where, skip, take: Number(limit),
        include: {
          department: true,
          user: { select: { email: true, role: true, isActive: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.employee.count({ where })
    ]);

    return sendSuccess(res, 'Employees fetched', employees, 200, {
      page: Number(page), limit: Number(limit), total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error(error);
    return sendError(res, 'Failed to fetch employees', 500);
  }
};

export const getEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const employee = await prisma.employee.findFirst({
      where: { id, tenantId: req.user!.tenantId },
      include: {
        department: true,
        user: { select: { email: true, role: true, isActive: true, lastLogin: true } },
        leaveBalances: { include: { leaveType: true } },
        documents: true,
      }
    });
    if (!employee) return sendError(res, 'Employee not found', 404);
    return sendSuccess(res, 'Employee fetched', employee);
  } catch (error) {
    return sendError(res, 'Failed', 500);
  }
};

export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const {
      firstName, lastName, email, phone, photo,
      dateOfBirth, gender, bloodGroup, nationalId,
      address, city, country,
      departmentId, departmentName, designation,
      employmentType, joiningDate, basicSalary,
      confirmationDate, managerId, biometricId,
      bankName, bankAccount, bankBranch,
      nidFront, nidBack, certificate1, certificate2, cv, offerLetter,
      role = 'EMPLOYEE',
    } = req.body;

    if (!firstName || !lastName || !email || !joiningDate) {
      return sendError(res, 'First name, last name, email and joining date are required');
    }

    // Check duplicate email
    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId: req.user!.tenantId }
    });
    if (existingUser) return sendError(res, 'An employee with this email already exists');

    // Resolve departmentId — if name given but no ID, find or create
    let resolvedDeptId: string | null = null;

    if (departmentId) {
      // Verify it belongs to this tenant
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, tenantId: req.user!.tenantId }
      });
      if (dept) resolvedDeptId = dept.id;
    }

    if (!resolvedDeptId && departmentName) {
      // Find existing department by name
      let dept = await prisma.department.findFirst({
        where: { name: departmentName, tenantId: req.user!.tenantId }
      });
      // Create if not exists
      if (!dept) {
        dept = await prisma.department.create({
          data: { tenantId: req.user!.tenantId, name: departmentName }
        });
      }
      resolvedDeptId = dept.id;
    }

    // Generate employee ID
    const empCount = await prisma.employee.count({ where: { tenantId: req.user!.tenantId } });
    const employeeId = `EMP${String(empCount + 1).padStart(4, '0')}`;

    // Generate temp password
    const tempPassword = Math.random().toString(36).substring(2, 10);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create user first
    const newUser = await prisma.user.create({
      data: {
        tenantId: req.user!.tenantId,
        email,
        password: hashedPassword,
        role,
      }
    });

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        tenantId: req.user!.tenantId,
        userId: newUser.id,
        employeeId,
        firstName,
        lastName,
        email,
        phone: phone || null,
        photo: photo || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        bloodGroup: bloodGroup || null,
        nationalId: nationalId || null,
        address: address || null,
        city: city || null,
        country: country || 'Bangladesh',
        departmentId: resolvedDeptId,
        designation: designation || null,
        employmentType: employmentType || 'FULL_TIME',
        joiningDate: new Date(joiningDate),
        basicSalary: basicSalary ? Number(basicSalary) : 0,
        confirmationDate: confirmationDate ? new Date(confirmationDate) : null,
        managerId: managerId || null,
        biometricId: biometricId || null,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        bankBranch: bankBranch || null,
      },
      include: {
        department: true,
        user: { select: { email: true, role: true } }
      }
    });

    // Save documents if any
    const docs = [
      { name: 'NID Front', type: 'NID_FRONT', url: nidFront },
      { name: 'NID Back', type: 'NID_BACK', url: nidBack },
      { name: 'Certificate', type: 'CERTIFICATE', url: certificate1 },
      { name: 'Certificate 2', type: 'CERTIFICATE', url: certificate2 },
      { name: 'CV', type: 'CV', url: cv },
      { name: 'Offer Letter', type: 'OFFER_LETTER', url: offerLetter },
    ].filter(d => d.url);

    if (docs.length > 0) {
      await prisma.document.createMany({
        data: docs.map(d => ({
          employeeId: employee.id,
          name: d.name,
          type: d.type,
          url: d.url,
        }))
      });
    }

    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const tenant = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId } });
    sendWelcomeEmail({
      to: email,
      firstName,
      companyName: tenant?.name || 'HR System',
      loginUrl: loginUrl + '/login',
      tempPassword,
      employeeId,
    }).catch(() => {});

    return sendSuccess(res, 'Employee created successfully', {
      ...employee,
      tempPassword,
    }, 201);
  } catch (error: any) {
    console.error('Create employee error:', error);
    return sendError(res, error.message || 'Failed to create employee', 500);
  }
};

export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const employee = await prisma.employee.findFirst({
      where: { id, tenantId: req.user!.tenantId }
    });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const {
      firstName, lastName, phone, photo,
      dateOfBirth, gender, bloodGroup, nationalId,
      address, city, country,
      departmentId, departmentName, designation,
      employmentType, employmentStatus, basicSalary,
      bankName, bankAccount, bankBranch,
      managerId, biometricId,
      confirmationDate, resignationDate,
    } = req.body;

    // Resolve department
    let resolvedDeptId = departmentId || employee.departmentId;
    if (!resolvedDeptId && departmentName) {
      let dept = await prisma.department.findFirst({
        where: { name: departmentName, tenantId: req.user!.tenantId }
      });
      if (!dept) {
        dept = await prisma.department.create({
          data: { tenantId: req.user!.tenantId, name: departmentName }
        });
      }
      resolvedDeptId = dept.id;
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        firstName, lastName, phone, photo,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender, bloodGroup, nationalId, address, city, country,
        departmentId: resolvedDeptId,
        designation, employmentType, employmentStatus,
        basicSalary: basicSalary ? Number(basicSalary) : undefined,
        bankName, bankAccount, bankBranch,
        managerId, biometricId,
        confirmationDate: confirmationDate ? new Date(confirmationDate) : undefined,
        resignationDate: resignationDate ? new Date(resignationDate) : undefined,
      },
      include: { department: true }
    });

    return sendSuccess(res, 'Employee updated', updated);
  } catch (error) {
    return sendError(res, 'Failed to update employee', 500);
  }
};

export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const employee = await prisma.employee.findFirst({
      where: { id, tenantId: req.user!.tenantId }
    });
    if (!employee) return sendError(res, 'Employee not found', 404);

    await prisma.employee.update({
      where: { id },
      data: { employmentStatus: 'TERMINATED' }
    });
    return sendSuccess(res, 'Employee terminated');
  } catch {
    return sendError(res, 'Failed', 500);
  }
};

export const getEmployeeStats = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const [total, active, onLeave, terminated] = await Promise.all([
      prisma.employee.count({ where: { tenantId } }),
      prisma.employee.count({ where: { tenantId, employmentStatus: 'ACTIVE' } }),
      prisma.employee.count({ where: { tenantId, employmentStatus: 'ON_LEAVE' } }),
      prisma.employee.count({ where: { tenantId, employmentStatus: 'TERMINATED' } }),
    ]);
    return sendSuccess(res, 'Stats fetched', { total, active, onLeave, terminated });
  } catch {
    return sendError(res, 'Failed', 500);
  }
};
