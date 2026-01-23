// backend/src/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../infra/db/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { Rol, usuarios } from '@prisma/client';



export interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    nombre: string;
    email: string;
    rol: Rol;
    estado: string;
    created_at: Date;
    updated_at: Date;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // 👤 Registrar usuario
  async register(dto: RegisterUserDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();

    const exists = await this.prisma.usuarios.findUnique({
      where: { email },
    });

    if (exists) {
      throw new ConflictException('El correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Rol por defecto OPERATIVO si no lo envían
    const rol: Rol = dto.rol ?? Rol.OPERATIVO;

    const user = await this.prisma.usuarios.create({
      data: {
        nombre: dto.nombre,
        email,
        password_hash: passwordHash,
        rol,
        estado: 'ACTIVO',
      },
    });

    return this.buildAuthResponse(user);
  }

  // 🔑 Login
  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();

    const user = await this.prisma.usuarios.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.password_hash);

    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Usuario inactivo');
    }

    return this.buildAuthResponse(user);
  }

  // 🧠 Construye token + usuario sin password y sin BigInt
  private buildAuthResponse(user: usuarios): AuthResponse {
    // Prisma devuelve BigInt en el id → lo convertimos a number
    const userId = Number(user.id);

    const payload = {
      sub: userId,
      email: user.email,
      rol: user.rol,
    };

    const accessToken = this.jwtService.sign(payload);

    // Usuario “seguro” sin password_hash y con id como number
    const safeUser: AuthResponse['user'] = {
      id: userId,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      estado: user.estado,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return {
      accessToken,
      user: safeUser,
    };
  }
}
