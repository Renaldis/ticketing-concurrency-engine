import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { OrderStatus } from '@prisma/client';
import redis from '../config/redis.js';
import { AppError } from '../utils/app-error.js';

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

  getOverallSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const summary = await this.adminService.getOverallSummary();
    res.status(200).json({
      status: 'success',
      data: { summary },
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

  getExpirationTtl = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const ttlMinutes = (await redis.get('system:order_expiration_ttl_minutes')) || '15';
    res.status(200).json({
      status: 'success',
      data: { ttlMinutes: parseInt(ttlMinutes, 10) },
    });
  });

  updateExpirationTtl = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { ttlMinutes } = req.body;
    if (!ttlMinutes || typeof ttlMinutes !== 'number' || ttlMinutes < 1 || ttlMinutes > 120) {
      throw new AppError('ttlMinutes must be a number between 1 and 120 minutes', 400);
    }
    await redis.set('system:order_expiration_ttl_minutes', ttlMinutes.toString());
    res.status(200).json({
      status: 'success',
      message: `Order expiration TTL successfully updated to ${ttlMinutes} minutes`,
      data: { ttlMinutes },
    });
  });

  getPlatformFee = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const feePercent = (await redis.get('system:platform_fee_percent')) || '2';
    res.status(200).json({
      status: 'success',
      data: { feePercent: parseFloat(feePercent) },
    });
  });

  updatePlatformFee = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { feePercent } = req.body;
    if (feePercent == null || typeof feePercent !== 'number' || feePercent < 0 || feePercent > 20) {
      throw new AppError('feePercent must be a number between 0 and 20%', 400);
    }
    await redis.set('system:platform_fee_percent', feePercent.toString());
    res.status(200).json({
      status: 'success',
      message: `Platform fee successfully updated to ${feePercent}%`,
      data: { feePercent },
    });
  });

  getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;

    const result = await this.adminService.getUsers({ page, limit, search });
    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  getUserAudit = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const data = await this.adminService.getUserAudit(String(userId));
    res.status(200).json({
      status: 'success',
      data,
    });
  });

  getEventAttendees = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { eventId } = req.params;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const data = await this.adminService.getEventAttendees(String(eventId), search, status);
    res.status(200).json({
      status: 'success',
      data,
    });
  });
}
