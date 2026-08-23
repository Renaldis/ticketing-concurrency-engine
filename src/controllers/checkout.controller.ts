import { Response } from 'express';
import { CheckoutService } from '../services/checkout.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/app-error';

export class CheckoutController {
  static async checkout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    const { eventId, ticketCategoryId, quantity } = req.body;

    // Validasi input dasar
    if (!userId) {
      throw new AppError('User authentication failed', 401);
    }

    if (!eventId || !ticketCategoryId || !quantity || quantity <= 0) {
      throw new AppError('Missing or invalid fields in request body', 400);
    }

    const result = await CheckoutService.executeCheckout(
      userId,
      eventId,
      ticketCategoryId,
      quantity,
    );
    res.status(201).json({
      message: 'Checkout successful',
      data: result,
    });
  }
}
