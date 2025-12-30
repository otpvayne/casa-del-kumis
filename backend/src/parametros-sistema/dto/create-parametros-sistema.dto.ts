import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateParametrosSistemaDto {
  @IsNumber()
  @Min(0)
  tasa_comision: number; // ej 0.012

  @IsNumber()
  @Min(0)
  margen_error_permitido: number; // ej 50 o 100

  @IsNumber()
  @Min(0)
  dias_desfase_banco: number; // ej 1

  @IsOptional()
  @IsBoolean()
  activo?: boolean; // por defecto true
}
