import { Router } from 'express';
import { OrderRepository } from '../repositories/order.repository.js';
import { AdminService } from '../services/admin.service.js';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';

const router = Router();

// Manual Dependency Injection Wiring
const orderRepo = new OrderRepository();
const adminService = new AdminService(orderRepo);
const adminController = new AdminController(adminService);

// Global Guard: Khusus Role ADMIN
router.use(authenticateToken as any, authorizeRoles('ADMIN') as any);

router.get('/admin/summary', adminController.getOverallSummary);
router.get('/admin/orders', adminController.getAllOrders);
router.get('/admin/events/:id/summary', adminController.getEventSummary);
router.get('/admin/settings/expiration', adminController.getExpirationTtl);
router.put('/admin/settings/expiration', adminController.updateExpirationTtl);

export default router;
