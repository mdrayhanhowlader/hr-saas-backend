import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { generateToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const register = async (req: Request, res: Response) => {
  try {
    const { companyName, email, password, phone, industry, size } = req.body;

    if (!companyName || !email || !password) {
      return sendError(res, 'Company name, email and password are required');
    }

    const existingTenant = await prisma.tenant.findFirst({
      where: { email }
    });

    if (existingTenant) {
      return sendError(res, 'Company with this email already exists');
    }

    const slug = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const hashedPassword = await bcrypt.hash(password, 12);

    const tenant = await prisma.tenant.create({
      data: {
        name: companyName,
        slug,
        email,
        phone,
        industry,
        size,
        users: {
          create: {
            email,
            password: hashedPassword,
            role: 'HR_ADMIN',
          }
        }
      },
      include: {
        users: true
      }
    });

    const user = tenant.users[0];
    const token = generateToken({
      id: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
    });

    return sendSuccess(res, 'Company registered successfully', {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: tenant.id,
        companyName: tenant.name,
      }
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return sendError(res, 'Registration failed', 500);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required');
    }

    const user = await prisma.user.findFirst({
      where: { email, isActive: true },
      include: {
        tenant: true,
        employee: true,
      }
    });

    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, 'Invalid email or password', 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const token = generateToken({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    return sendSuccess(res, 'Login successful', {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        companyName: user.tenant.name,
        employeeId: user.employee?.id || null,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 'Login failed', 500);
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        tenant: true,
        employee: {
          include: {
            department: true,
          }
        }
      }
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, 'User fetched successfully', {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      company: {
        id: user.tenant.id,
        name: user.tenant.name,
        logo: user.tenant.logo,
        currency: user.tenant.currency,
        timezone: user.tenant.timezone,
      },
      employee: user.employee ? {
        id: user.employee.id,
        firstName: user.employee.firstName,
        lastName: user.employee.lastName,
        employeeId: user.employee.employeeId,
        designation: user.employee.designation,
        department: user.employee.department?.name,
        photo: user.employee.photo,
      } : null,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch user', 500);
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current and new password are required');
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return sendError(res, 'User not found', 404);

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return sendError(res, 'Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    return sendSuccess(res, 'Password changed successfully');
  } catch (error) {
    return sendError(res, 'Failed to change password', 500);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, 'Email is required');

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return sendSuccess(res, 'If email exists, reset link will be sent');

    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetExpires = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires }
    });

    return sendSuccess(res, 'Password reset link sent to email');
  } catch (error) {
    return sendError(res, 'Failed to process request', 500);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return sendError(res, 'Token and new password are required');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetExpires: { gt: new Date() }
      }
    });

    if (!user) return sendError(res, 'Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetExpires: null }
    });

    return sendSuccess(res, 'Password reset successfully');
  } catch (error) {
    return sendError(res, 'Failed to reset password', 500);
  }
};
