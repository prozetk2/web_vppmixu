import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name ?? user.roleId,
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET') ?? 'changeme',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '1d',
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: payload.role,
        name: user.name,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('USER_NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role?.name ?? user.roleId,
      name: user.name,
    };
  }

  async seedDefaultAdmin() {
    const adminEmail = 'admin@example.com';
    const existing = await this.prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) return existing;

    const passwordHash = await bcrypt.hash('admin123', 10);
    return this.prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Admin',
        role: {
          connectOrCreate: {
            where: { name: 'ADMIN' },
            create: { name: 'ADMIN' },
          },
        },
      },
      include: { role: true },
    });
  }
}
