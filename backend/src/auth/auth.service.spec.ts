import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Login', () => {
    it('should return access token for valid credentials', async () => {
      const loginDto = {
        username: 'admin',
        password: 'password123',
      };

      const mockUser = {
        id: BigInt(1),
        username: 'admin',
        passwordHash: 'hashedPassword',
        enabled: true,
      };

      const mockRoles = [
        {
          role: {
            name: 'ADMIN',
          },
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userRole.findMany.mockResolvedValue(mockRoles);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'jwt-token',
        user: expect.objectContaining({
          username: 'admin',
          roles: ['ADMIN'],
        }),
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
    });

    it('should throw UnauthorizedException for invalid username', async () => {
      const loginDto = {
        username: 'nonexistent',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto = {
        username: 'admin',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: BigInt(1),
        username: 'admin',
        passwordHash: 'hashedPassword',
        enabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for disabled user', async () => {
      const loginDto = {
        username: 'admin',
        password: 'password123',
      };

      const mockUser = {
        id: BigInt(1),
        username: 'admin',
        passwordHash: 'hashedPassword',
        enabled: false, // Disabled
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Validate User', () => {
    it('should return user for valid JWT payload', async () => {
      const payload = {
        sub: '1',
        username: 'admin',
      };

      const mockUser = {
        id: BigInt(1),
        username: 'admin',
        enabled: true,
      };

      const mockRoles = [
        {
          role: {
            name: 'ADMIN',
          },
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userRole.findMany.mockResolvedValue(mockRoles);

      const result = await service.validateUser(payload);

      expect(result).toEqual(
        expect.objectContaining({
          id: '1',
          username: 'admin',
          roles: ['ADMIN'],
        }),
      );
    });

    it('should return null for invalid user', async () => {
      const payload = {
        sub: '999',
        username: 'nonexistent',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'password123';
      const hashedPassword = 'hashedPassword';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('should compare password correctly', async () => {
      const password = 'password123';
      const hash = 'hashedPassword';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.comparePassword(password, hash);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should return correct roles for user', async () => {
      const userId = BigInt(1);

      const mockRoles = [
        {
          role: {
            name: 'ADMIN',
          },
        },
        {
          role: {
            name: 'MANAGER',
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockRoles);

      const result = await service.getUserRoles(userId);

      expect(result).toEqual(['ADMIN', 'MANAGER']);
    });

    it('should return empty array for user with no roles', async () => {
      const userId = BigInt(1);

      mockPrismaService.userRole.findMany.mockResolvedValue([]);

      const result = await service.getUserRoles(userId);

      expect(result).toEqual([]);
    });
  });

  describe('JWT Token', () => {
    it('should generate valid JWT token', () => {
      const payload = {
        sub: '1',
        username: 'admin',
        roles: ['ADMIN'],
      };

      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = service.generateToken(payload);

      expect(result).toBe('jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(payload);
    });

    it('should verify JWT token', () => {
      const token = 'jwt-token';
      const payload = {
        sub: '1',
        username: 'admin',
      };

      mockJwtService.verify.mockReturnValue(payload);

      const result = service.verifyToken(token);

      expect(result).toEqual(payload);
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
    });
  });
});
