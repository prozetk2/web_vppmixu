import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async validateUser(username: string, password: string) {
    const { data: user, error } = await this.supabase
      .getClient()
      .from('app_user')
      .select(`
        *,
        user_role (
          role (
            id,
            code,
            name
          )
        )
      `)
      .eq('username', username)
      .single();

    if (error || !user || !user.password_hash) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    const roles = user.user_role?.map((ur: any) => ur.role.code) || [];
    const payload = {
      sub: user.id.toString(),
      username: user.username,
      roles: roles,
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET') ?? 'changeme',
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ?? '1d') as any,
    });

    return {
      access_token: token,
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        roles: roles,
        fullName: user.full_name,
      },
    };
  }

  async getProfile(userId: string) {
    const { data: user, error } = await this.supabase
      .getClient()
      .from('app_user')
      .select(`
        *,
        user_role (
          role (
            id,
            code,
            name
          )
        )
      `)
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('USER_NOT_FOUND');
    }

    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      roles: user.user_role?.map((ur: any) => ur.role.code) || [],
      fullName: user.full_name,
    };
  }
}
