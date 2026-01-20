import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadRedebanDto {
  @ApiProperty({
    description: 'Fecha de conciliación en formato YYYY-MM-DD',
    example: '2025-12-22',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsNotEmpty({ message: 'La fecha de conciliación es requerida' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fechaConciliacion debe tener formato YYYY-MM-DD',
  })
  fechaConciliacion: string;
}