import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class VoucherTxDto {
  @IsIn(['VISA', 'MASTERCARD'])
  franquicia: 'VISA' | 'MASTERCARD';

  @IsOptional()
  @IsString()
  ultimos_digitos?: string;

  @IsOptional()
  @IsString()
  numero_recibo?: string;

  @IsNumber()
  @Min(1)
  monto: number;
}

export class UpdateVoucherDraftDto {
  @IsOptional()
  @IsNumber()
  totalVisa?: number;

  @IsOptional()
  @IsNumber()
  totalMastercard?: number;

  @IsOptional()
  @IsNumber()
  totalGlobal?: number;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoucherTxDto)
  transacciones?: VoucherTxDto[];
}
