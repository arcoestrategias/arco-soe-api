import { IsBoolean } from 'class-validator';

export class ToggleActivePriorityDto {
  @IsBoolean()
  isActive!: boolean;
}
