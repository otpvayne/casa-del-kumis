import { IsInt, IsOptional, Min } from 'class-validator';

export class AddVoucherImagenDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number; // si no llega, se autogenera
}
