import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from '../utils/app-error';

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new AppError('Forbidden: Insufficient permissions', 403);
    }
    next();
  };
};
