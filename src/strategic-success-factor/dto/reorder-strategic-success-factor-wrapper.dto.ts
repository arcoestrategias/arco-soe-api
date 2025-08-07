import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ReorderStrategicSuccessFactorDto } from './reorder-strategic-success-factor.dto';

export class ReorderStrategicSuccessFactorWrapperDto {
  @IsUUID()
  strategicPlanId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderStrategicSuccessFactorDto)
  items: ReorderStrategicSuccessFactorDto[];
}
