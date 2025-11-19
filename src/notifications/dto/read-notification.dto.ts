import { IsUUID } from 'class-validator';
export class ReadNotificationDto {
  @IsUUID() id!: string;
}
