import { IsNotEmpty, IsNumberString, IsString, Matches } from 'class-validator';

export class UploadRedebanDto {
  @IsNotEmpty()
  @IsNumberString()
  sucursalId: string;

  // YYYY-MM-DD
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaConciliacion debe ser YYYY-MM-DD' })
  fechaConciliacion: string;
}
