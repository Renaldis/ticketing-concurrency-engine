import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../utils/app-error';

export class AuthService {
  // Dependency disuntikkan secara dinamis di constructor
  constructor(private userRepo: UserRepository) {}

  async registerUser(email: string, password: string, name?: string) {
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email is already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.userRepo.create({
      email,
      password: hashedPassword,
      name,
      role: 'CUSTOMER',
    });

    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async loginUser(email: string, password: string) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError('JWT secret is not configured in environment variables', 500);
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, {
      expiresIn: '1d',
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
