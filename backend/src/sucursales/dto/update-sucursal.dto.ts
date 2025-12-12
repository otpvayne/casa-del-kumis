import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateSucursalDto {
  @IsOptional()
  @IsString()
  @Length(3, 150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Length(5, 50)
  codigo_comercio_redeban?: string;

  @IsOptional()
  @IsString()
  @Length(5, 50)
  codigo_referencia_banco?: string;

  @IsOptional()
  @IsString()
  @Length(3, 255)
  direccion?: string;

  @IsOptional()
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: 'ACTIVO' | 'INACTIVO';
}
