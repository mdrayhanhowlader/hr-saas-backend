import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: string;
    email: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
