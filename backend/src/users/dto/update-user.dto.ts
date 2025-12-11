// backend/src/users/dto/update-user.dto.ts
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Rol } from '@prisma/client';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsEnum(Rol)
  @IsOptional()
  rol?: Rol;

  @IsString()
  @IsOptional()
  estado?: string; // ACTIVO / INACTIVO
}
