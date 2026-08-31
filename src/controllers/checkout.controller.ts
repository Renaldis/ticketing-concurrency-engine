import { Response } from 'express';
import { CheckoutService } from '../services/checkout.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../utils/app-error.js';
import { UserRepository } from '../repositories/user.repository.js';
import { createMidtransSnapTransaction } from '../utils/midtrans.js';
import { asyncHandler } from '../utils/async-handler.js';
import prisma from '../config/prisma.js';

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

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User session is invalid or user no longer exists. Please sign in again.', 401);
    }

    const result = await this.checkoutService.executeCheckout(
      userId,
      eventId,
      ticketCategoryId,
      quantity,
    );
    const order = result.order;

    let payment = null;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isMocked = !serverKey || serverKey.includes('your-midtrans-');

    if (!isMocked) {
      console.log(
        `[Checkout Controller]: Generating Midtrans Snap URL token for Order ${order.id} with ${result.ttlMinutes} mins expiry...`,
      );
      const snapResult = await createMidtransSnapTransaction({
        orderId: order.id,
        grossAmount: Number(order.totalAmount),
        expiryMinutes: result.ttlMinutes,
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

        // Simpan token & redirect URL ke record transaksi agar bisa di-resume nanti
        await prisma.transaction.update({
          where: { orderId: order.id },
          data: {
            snapToken: snapResult.token,
            snapRedirectUrl: snapResult.redirect_url,
          },
        });
      }
    } else {
      console.warn(
        '[Checkout Controller]: MIDTRANS_SERVER_KEY is placeholder. Bypassing token generation.',
      );
      payment = {
        token: 'mock-midtrans-snap-token-12345678',
        redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-token-12345678`,
      };

      await prisma.transaction.update({
        where: { orderId: order.id },
        data: {
          snapToken: payment.token,
          snapRedirectUrl: payment.redirectUrl,
        },
      });
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
