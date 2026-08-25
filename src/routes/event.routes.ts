import { Router } from 'express';
import { EventRepository } from '../repositories/event.repository.js';
import { EventService } from '../services/event.service.js';
import { EventController } from '../controllers/event.controller.js';
import { upload } from '../middleware/upload.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

const eventRepo = new EventRepository();
const eventService = new EventService(eventRepo);
const eventController = new EventController(eventService);

router.get('/events', eventController.getAll);

router.get('/events/:id', eventController.getById);

router.post('/events', authenticateToken as any, upload.single('image'), eventController.create);

export default router;
