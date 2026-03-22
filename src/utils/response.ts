import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
  pagination?: ApiResponse['pagination']
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  error?: string
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
};
