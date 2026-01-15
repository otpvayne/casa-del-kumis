// backend/src/users/users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../infra/db/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Rol, usuarios } from '@prisma/client';

export interface SafeUser {
  id: number;          // 👈 number, no BigInt
  nombre: string;
  email: string;
  rol: Rol;
  estado: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Convierte un registro de Prisma (con BigInt y password_hash) en un usuario seguro */
  private toSafeUser(user: usuarios): SafeUser {
    return {
      id: Number(user.id), // 👈 BigInt -> number
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      estado: user.estado,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  // 📋 Listar todos los usuarios
  async findAll(): Promise<SafeUser[]> {
    const users = await this.prisma.usuarios.findMany({
      orderBy: { created_at: 'desc' },
    });

    return users.map((u) => this.toSafeUser(u));
  }

  // 👁 Ver un usuario por id
  async findOne(id: number): Promise<SafeUser> {
    const user = await this.prisma.usuarios.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.toSafeUser(user);
  }

  // ➕ Crear usuario
  async create(dto: CreateUserDto): Promise<SafeUser> {
    const email = dto.email.toLowerCase();

    const exists = await this.prisma.usuarios.findUnique({
      where: { email },
    });

    if (exists) {
      throw new ConflictException('El correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
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

    return this.toSafeUser(user);
  }

  // ✏️ Actualizar usuario
  async update(id: number, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.prisma.usuarios.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    let password_hash: string | undefined;

    if (dto.password) {
      password_hash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.usuarios.update({
      where: { id },
      data: {
        nombre: dto.nombre ?? user.nombre,
        email: dto.email?.toLowerCase() ?? user.email,
        rol: dto.rol ?? user.rol,
        estado: dto.estado ?? user.estado,
        ...(password_hash ? { password_hash } : {}),
      },
    });

    return this.toSafeUser(updated);
  }

  // 🚫 Desactivar usuario
  async deactivate(id: number): Promise<SafeUser> {
    const user = await this.prisma.usuarios.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const updated = await this.prisma.usuarios.update({
      where: { id },
      data: { estado: 'INACTIVO' },
    });

    return this.toSafeUser(updated);
  }
  // ✅ Activar usuario
async activate(id: number) {
  const user = await this.prisma.usuarios.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundException('Usuario no encontrado');
  }

  return this.prisma.usuarios.update({
    where: { id },
    data: {
      estado: 'ACTIVO',
    },
  });
}
// 🗑 Eliminar usuario
async remove(id: number) {
  const user = await this.prisma.usuarios.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundException('Usuario no encontrado');
  }

  return this.prisma.usuarios.delete({
    where: { id },
  });
}

}
