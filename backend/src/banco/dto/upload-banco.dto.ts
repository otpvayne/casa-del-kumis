import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UploadBancoDto {
  @IsString()
  @IsNotEmpty()
  fechaArchivo: string; // YYYY-MM-DD

  @Type(() => Number) // ✅ convierte "6" => 6
  @IsInt()
  @Min(1)
  sucursalId: number;
}
