// backend/src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { JwtPayload } from './jwt.strategy';
import { Rol } from '@prisma/client';

type RequestWithUser = Request & { user: JwtPayload };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Cualquier usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: RequestWithUser): JwtPayload {
    return req.user;
  }

  // Ejemplo: solo PROPIETARIO y ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PROPIETARIO, Rol.ADMIN)
  @Get('admin-only')
  adminOnly(@Req() req: RequestWithUser) {
    return {
      message: 'Solo propietarios y administradores pueden ver esto',
      user: req.user,
    };
  }
}
