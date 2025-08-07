import { PartialType } from '@nestjs/mapped-types';
import { CreateStrategicSuccessFactorDto } from './create-strategic-success-factor.dto';

export class UpdateStrategicSuccessFactorDto extends PartialType(CreateStrategicSuccessFactorDto) {}
