import { PartialType } from '@nestjs/mapped-types';
import { CreateLeverDto } from './create-lever.dto';

export class UpdateLeverDto extends PartialType(CreateLeverDto) {}
