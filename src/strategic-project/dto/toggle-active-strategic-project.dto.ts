import { IsBoolean } from 'class-validator';

export class ToggleActiveStrategicProjectDto {
  @IsBoolean()
  isActive!: boolean;
}
