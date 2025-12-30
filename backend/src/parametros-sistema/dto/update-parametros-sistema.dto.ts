import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateParametrosSistemaDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  tasa_comision?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  margen_error_permitido?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dias_desfase_banco?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
