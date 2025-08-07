import { PartialType } from '@nestjs/mapped-types';
import { CreateStrategicValueDto } from './create-strategic-value.dto';

export class UpdateStrategicValueDto extends PartialType(CreateStrategicValueDto) {}
