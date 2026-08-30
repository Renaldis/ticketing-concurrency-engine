import { Request, Response } from 'express';
import { TicketService } from '../services/ticket.service.js';
import { asyncHandler } from '../utils/async-handler.js';

export class TicketController {
  constructor(private ticketService: TicketService) {}

  checkIn = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { qrData } = req.body;
    const result = await this.ticketService.processCheckIn(qrData);

    res.status(200).json({
      status: 'success',
      message: 'Check-in successful! Welcome to the event.',
      data: result,
    });
  });
}
