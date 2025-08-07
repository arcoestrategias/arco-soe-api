import { PartialType } from '@nestjs/mapped-types';
import { CreateStrategicPlanDto } from './create-strategic-plan.dto';

export class UpdateStrategicPlanDto extends PartialType(CreateStrategicPlanDto) {}
