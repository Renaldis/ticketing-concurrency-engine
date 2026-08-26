import { Response } from 'express';
import { CheckoutService } from '../services/checkout.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/app-error';
import { UserRepository } from '../repositories/user.repository';
import { createMidtransSnapTransaction } from '../utils/midtrans';

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
    const order = result.order;

    const userRepo = new UserRepository();
    const user = await userRepo.findById(userId);

    let payment = null;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isMocked = !serverKey || serverKey.includes('your-midtrans-');

    if (!isMocked) {
      console.log(
        `[Checkout Controller]: Generating Midtrans Snap URL token for Order ${order.id}...`,
      );
      const snapResult = await createMidtransSnapTransaction({
        orderId: order.id,
        grossAmount: Number(order.totalAmount),
        customerDetails: {
          name: user?.name || 'Customer',
          email: user?.email || 'customer@example.com',
        },
      });
      if (snapResult) {
        payment = {
          token: snapResult.token,
          redirectUrl: snapResult.redirect_url,
        };
      }
    } else {
      console.warn(
        '[Checkout Controller]: MIDTRANS_SERVER_KEY is placeholder. Bypassing token generation.',
      );
      payment = {
        token: 'mock-midtrans-snap-token-12345678',
        redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-token-12345678`,
      };
    }
    res.status(201).json({
      message: 'Checkout successful',
      data: {
        order,
        ticketLeft: result.ticketLeft,
        payment,
      },
    });
  }
}
