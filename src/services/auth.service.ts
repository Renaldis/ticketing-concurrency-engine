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

    const { password: _password, ...userWithoutPassword } = newUser;
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

  async getProfile(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, name: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updated = await this.userRepo.update(userId, { name });
    const { password: _password, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPass, user.password);
    if (!isMatch) {
      throw new AppError('Password lama tidak sesuai', 400);
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await this.userRepo.update(userId, { password: hashedPassword });

    return { message: 'Password berhasil diubah' };
  }
}
