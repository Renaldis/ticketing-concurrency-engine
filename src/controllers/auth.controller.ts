import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/async-handler';

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
}
