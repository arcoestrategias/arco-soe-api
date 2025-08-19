import { IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class FilterPriorityDto {
  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsUUID()
  objectiveId?: string;

  @IsOptional()
  @IsIn(['OPE', 'CLO', 'CAN'])
  status?: 'OPE' | 'CLO' | 'CAN';

  @IsOptional()
  @IsInt()
  @Min(1)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  // clasificación mensual derivada
  @IsOptional()
  @IsIn([
    'ABIERTAS',
    'NO_CUMPLIDAS_ATRASADAS_DEL_MES',
    'ANULADAS',
    'CUMPLIDAS_A_TIEMPO',
    'CUMPLIDAS_ATRASADAS_DEL_MES',
    'CUMPLIDAS_ATRASADAS_MESES_ANTERIORES',
    'CUMPLIDAS_DE_OTRO_MES',
    'NO_CUMPLIDAS_ATRASADAS_MESES_ANTERIORES',
  ])
  monthlyClass?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
