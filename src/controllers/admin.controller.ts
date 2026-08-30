import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { OrderStatus } from '@prisma/client';

export class AdminController {
  constructor(private adminService: AdminService) {}

  getAllOrders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as OrderStatus | undefined;
    const eventId = req.query.eventId as string | undefined;

    const result = await this.adminService.getAllOrders({
      page,
      limit,
      status,
      eventId,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  getEventSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const summary = await this.adminService.getEventSummary(String(id));

    res.status(200).json({
      status: 'success',
      data: { summary },
    });
  });
}
