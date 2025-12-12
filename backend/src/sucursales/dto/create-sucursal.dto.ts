import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateSucursalDto {
  @IsString()
  @Length(3, 150)
  nombre: string;

  // Ej: 0063286819
  @IsString()
  @Length(5, 50)
  codigo_comercio_redeban: string;

  // Referencia 1 en banco (puede ser igual al comercio)
  @IsString()
  @Length(5, 50)
  codigo_referencia_banco: string;

  @IsOptional()
  @IsString()
  @Length(3, 255)
  direccion?: string;

  // Importante por tu check constraint
  @IsOptional()
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: 'ACTIVO' | 'INACTIVO';
}
