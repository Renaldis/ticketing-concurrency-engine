import { Router } from 'express';
import { OrderRepository } from '../repositories/order.repository.js';
import { OrderService } from '../services/order.service.js';
import { OrderController } from '../controllers/order.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Manual Dependency Injection Wiring
const orderRepo = new OrderRepository();
const orderService = new OrderService(orderRepo);
const orderController = new OrderController(orderService);

router.get('/orders/my-orders', authenticateToken as any, orderController.getMyOrders);
router.get('/orders/:id/ticket', authenticateToken as any, orderController.getETicket);
router.post('/orders/:id/sync-status', authenticateToken as any, orderController.syncStatus);

export default router;
