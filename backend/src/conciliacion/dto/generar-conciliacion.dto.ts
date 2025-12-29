import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GenerarConciliacionDto {
  @IsInt()
  @Min(1)
  sucursalId: number;

  // YYYY-MM-DD
  @IsString()
  fechaVentas: string;

  // opcional: si quieres recalcular aunque ya exista
  @IsOptional()
  force?: boolean;
}
