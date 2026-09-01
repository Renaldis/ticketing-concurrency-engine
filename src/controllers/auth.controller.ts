import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/async-handler';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/app-error';

export class AuthController {
  constructor(private authService: AuthService) {}

  // Kita gunakan arrow function agar konteks "this" tidak lepas saat dilempar ke router Express
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, name } = req.body;
    const user = await this.authService.registerUser(email, password, name);
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: { user },
    });
  });

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const result = await this.authService.loginUser(email, password);
    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: result,
    });
  });

  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const user = await this.authService.getProfile(userId);
    res.status(200).json({
      status: 'success',
      data: { user },
    });
  });

  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const { name } = req.body;
    const user = await this.authService.updateProfile(userId, name);
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user },
    });
  });

  changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const { currentPassword, newPassword } = req.body;
    const result = await this.authService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  });
}
