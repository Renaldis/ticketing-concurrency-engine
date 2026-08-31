import { Router } from 'express';
import { EventRepository } from '../repositories/event.repository.js';
import { EventService } from '../services/event.service.js';
import { EventController } from '../controllers/event.controller.js';
import { upload } from '../middleware/upload.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createEventSchema, updateEventSchema } from '../validators/event.validator.js';

const router = Router();
const eventRepo = new EventRepository();
const eventService = new EventService(eventRepo);
const eventController = new EventController(eventService);

router.get('/events', eventController.getAll);
router.get('/events/:id', eventController.getById);

router.post(
  '/events',
  authenticateToken as any,
  authorizeRoles('ADMIN') as any,
  upload.single('image'),
  validate(createEventSchema) as any,
  eventController.create,
);

router.put(
  '/events/:id',
  authenticateToken as any,
  authorizeRoles('ADMIN') as any,
  upload.single('image'),
  validate(updateEventSchema) as any,
  eventController.update,
);

router.delete(
  '/events/:id',
  authenticateToken as any,
  authorizeRoles('ADMIN') as any,
  eventController.delete,
);

// --- TICKET CATEGORIES & STOCK ENDPOINTS (ADMIN ONLY) ---
router.post(
  '/events/:id/categories',
  authenticateToken as any,
  authorizeRoles('ADMIN') as any,
  eventController.addCategory,
);

router.patch(
  '/events/categories/:categoryId/stock',
  authenticateToken as any,
  authorizeRoles('ADMIN') as any,
  eventController.adjustStock,
);

router.delete(
  '/events/categories/:categoryId',
  authenticateToken as any,
  authorizeRoles('ADMIN') as any,
  eventController.deleteCategory,
);

export default router;
