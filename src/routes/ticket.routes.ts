import { Router } from 'express';
import { TicketService } from '../services/ticket.service.js';
import { TicketController } from '../controllers/ticket.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { checkInSchema } from '../validators/ticket.validator.js';

const router = Router();

// Manual Dependency Injection Wiring
const ticketService = new TicketService();
const ticketController = new TicketController(ticketService);

// Khusus Admin / Gate Scanner Staff
router.post(
  '/tickets/check-in',
  authenticateToken as any,
  authorizeRoles('ADMIN') as any,
  validate(checkInSchema) as any,
  ticketController.checkIn,
);

export default router;
