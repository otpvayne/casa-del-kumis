// backend/src/auth/auth.controller.ts
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { JwtPayload } from './jwt.strategy';
import { Rol } from '@prisma/client';

// ✅ Swagger
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

type RequestWithUser = Request & { user: JwtPayload };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar usuario' })
  @ApiBody({
    type: RegisterUserDto,
    examples: {
      ejemplo: {
        summary: 'Registro básico',
        value: {
          nombre: 'Juan Pablo',
          email: 'juan@email.com',
          password: '123456',
          rol: 'OPERATIVO',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Error de validación / usuario ya existe',
  })
  register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login y obtención de JWT' })
  @ApiBody({
    type: LoginDto,
    examples: {
      ejemplo: {
        summary: 'Login básico',
        value: {
          email: 'juan@email.com',
          password: '123456',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login OK, retorna access_token y user',
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales inválidas',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Cualquier usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Ver payload del usuario autenticado (JWT)' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Payload del JWT',
    schema: {
      example: {
        sub: 1,
        email: 'juan@email.com',
        rol: 'OPERATIVO',
        iat: 1710000000,
        exp: 1710003600,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  getProfile(@Req() req: RequestWithUser): JwtPayload {
    return req.user;
  }

  // Ejemplo: solo PROPIETARIO y ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PROPIETARIO, Rol.ADMIN)
  @Get('admin-only')
  @ApiOperation({ summary: 'Endpoint de prueba solo ADMIN y PROPIETARIO' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'OK (rol permitido)',
    schema: {
      example: {
        message: 'Solo propietarios y administradores pueden ver esto',
        user: {
          sub: 1,
          email: 'juan@email.com',
          rol: 'ADMIN',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  adminOnly(@Req() req: RequestWithUser) {
    return {
      message: 'Solo propietarios y administradores pueden ver esto',
      user: req.user,
    };
  }
}
