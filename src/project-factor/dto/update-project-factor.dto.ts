import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectFactorDto } from './create-project-factor.dto';

export class UpdateProjectFactorDto extends PartialType(
  CreateProjectFactorDto,
) {}
