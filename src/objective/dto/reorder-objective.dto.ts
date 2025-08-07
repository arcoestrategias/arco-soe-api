import { IsUUID, IsInt, IsBoolean } from 'class-validator';

export class ReorderObjectiveDto {
  @IsUUID()
  id: string;

  @IsInt()
  order: number;

  @IsBoolean()
  isActive: boolean;
}
