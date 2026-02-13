import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsNumber,
  MaxLength,
  IsDate,
  IsIn,
} from 'class-validator';

export class CreateIndicatorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  formula?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isConfigured?: boolean;

  // Manual=MAN, Automatico=AUT
  @IsString()
  @IsIn(['MAN', 'AUT'])
  @IsOptional()
  origin?: string;

  // Creciente=POS, Decreciente=NEG, Mantenimiento=MAN, Hito=HIT
  @IsString()
  @IsIn(['POS', 'NEG', 'MAN', 'HIT'])
  @IsOptional()
  tendence?: string;

  // Trimestral=TRI, Cuatrimestral=QTR, Mensual=MES, Semestral=STR, Anual=ANU, Personalizado=PER
  @IsString()
  @IsIn(['MES', 'TRI', 'QTR', 'STR', 'ANU', 'PER'])
  @IsOptional()
  frequency?: string;

  // Porcentaje=POR, Ratio=RAT, Unidad=UNI, Moneda=MON, Unico=UNC
  @IsString()
  @IsIn(['POR', 'RAT', 'UNI', 'MON', 'UNC'])
  @IsOptional()
  measurement?: string;

  // Resultado=RES, Gestion=GES
  @IsString()
  @IsIn(['RES', 'GES'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reference?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  periodStart?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  periodEnd?: Date | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseValue?: number;
}
