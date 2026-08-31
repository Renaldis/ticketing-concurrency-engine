import { Response } from 'express';
import { OrderService } from '../services/order.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AppError } from '../utils/app-error.js';

export class OrderController {
  constructor(private orderService: OrderService) {}

  getMyOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const orders = await this.orderService.getUserOrders(userId);
    res.status(200).json({
      status: 'success',
      data: { orders },
    });
  });

  getETicket = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const ticket = await this.orderService.getEticket(String(id), userId);
    res.status(200).json({
      status: 'success',
      data: { ticket },
    });
  });

  syncStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const order = await this.orderService.syncOrderStatus(String(id), userId);
    res.status(200).json({
      status: 'success',
      message: 'Order status synchronized with payment provider',
      data: { order },
    });
  });

  getPaymentToken = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw new AppError('Unauthorized', 401);
      }

      const payment = await this.orderService.getPaymentToken(String(id), userId);
      res.status(200).json({
        status: 'success',
        data: { payment },
      });
    },
  );

  cancelOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await this.orderService.cancelUserOrder(String(id), userId);
    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  });
}
