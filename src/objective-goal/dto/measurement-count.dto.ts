import { IsInt, IsBoolean, Min, Max } from 'class-validator';

export class UpdateMeasurementCountDto {
  @IsInt()
  @Min(2)
  @Max(50)
  measurementCount: number;

  @IsBoolean()
  applyToFuture: boolean;
}
