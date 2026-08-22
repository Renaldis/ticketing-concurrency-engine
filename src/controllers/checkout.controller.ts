import { Request, Response } from 'express';
import { CheckoutService } from '../services/checkout.service';

export class CheckoutController {
  static async checkout(req: Request, res: Response): Promise<void> {
    const { userId, eventId, ticketCategoryId, quantity } = req.body;

    // Validasi input dasar
    if (!userId || !eventId || !ticketCategoryId || !quantity || quantity <= 0) {
      res.status(400).json({ error: 'Missing or invalid fields' });
      return;
    }

    try {
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
    } catch (error: any) {
      console.error('[Checkout Controller Error]:', error.message);
      res.status(400).json({
        error: error.message || 'Verification or processing failed',
      });
    }
  }
}
