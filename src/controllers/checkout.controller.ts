import { Response } from 'express';
import { CheckoutService } from '../services/checkout.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../utils/app-error.js';
import { UserRepository } from '../repositories/user.repository.js';
import { createMidtransSnapTransaction } from '../utils/midtrans.js';
import { asyncHandler } from '../utils/async-handler.js';

export class CheckoutController {
  constructor(
    private checkoutService: typeof CheckoutService = CheckoutService,
    private userRepo: UserRepository = new UserRepository(),
  ) {}

  checkout = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { eventId, ticketCategoryId, quantity } = req.body;

    if (!userId) {
      throw new AppError('User authentication failed', 401);
    }

    const result = await this.checkoutService.executeCheckout(
      userId,
      eventId,
      ticketCategoryId,
      quantity,
    );
    const order = result.order;

    const user = await this.userRepo.findById(userId);

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
  });
}
