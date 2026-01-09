import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateVoucherDraftDto {
  @IsInt()
  @Min(1)
  sucursalId: number;

  @IsString()
  @IsNotEmpty()
  fechaOperacion: string; // YYYY-MM-DD
}
