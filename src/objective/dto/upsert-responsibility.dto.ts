import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export enum ResponsibilityTypeDto {
  IMPUTABLE = 'IMPUTABLE',
  SUPPORT = 'SUPPORT',
  INFORMED = 'INFORMED',
}

export class UpsertResponsibilityDto {
  @IsUUID()
  @IsNotEmpty()
  objectiveId: string;

  @IsUUID()
  @IsNotEmpty()
  positionId: string;

  @IsEnum(ResponsibilityTypeDto)
  @IsNotEmpty()
  type: ResponsibilityTypeDto;
}