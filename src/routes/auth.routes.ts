import { Router } from 'express';
import { UserRepository } from '../repositories/user.repository.js';
import { AuthService } from '../services/auth.service.js';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';
import { createRateLimiter } from '../middleware/rate-limiter.middleware.js';

const router = Router();

const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'login',
});

// MANUAL DEPENDENCY INJECTION WIRING
const userRepo = new UserRepository();
const authService = new AuthService(userRepo);
const authController = new AuthController(authService);

router.post('/auth/register', validate(registerSchema), authController.register);
router.post('/auth/login', loginLimiter as any, validate(loginSchema), authController.login);

export default router;
