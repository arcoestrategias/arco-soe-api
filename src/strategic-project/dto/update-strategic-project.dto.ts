import { PartialType } from '@nestjs/mapped-types';
import { CreateStrategicProjectDto } from './create-strategic-project.dto';

export class UpdateStrategicProjectDto extends PartialType(
  CreateStrategicProjectDto,
) {}
