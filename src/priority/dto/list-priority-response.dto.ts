import { ResponsePriorityDto } from './response-priority.dto';
import { ResponsePriorityIcpDto } from './calculate-icp.dto';

export class ListPriorityResponseDto {
  items!: ResponsePriorityDto[];
  total!: number;
  page!: number;
  limit!: number;

  // Si no vienen month/year en el query, se deja undefined
  icp?: ResponsePriorityIcpDto;
}
