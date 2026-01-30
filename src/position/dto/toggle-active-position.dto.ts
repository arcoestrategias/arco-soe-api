import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleActivePositionDto {
  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;
}
