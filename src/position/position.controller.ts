import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  CreatePositionDto,
  UpdatePositionDto,
  ResponsePositionDto,
} from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { PositionsService } from './position.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Permissions(PERMISSIONS.POSITIONS.CREATE)
  @SuccessMessage('Posición creada exitosamente')
  @Post()
  async create(
    @Body() dto: CreatePositionDto,
    @UserId() userId: string,
  ): Promise<ResponsePositionDto> {
    const position = await this.positionsService.create(dto, userId);
    return new ResponsePositionDto(position);
  }

  @Get('company/:companyId/group-by-business-unit')
  @Permissions(PERMISSIONS.POSITIONS.READ)
  async listByCompanyGroupedByBusinessUnit(
    @Param('companyId') companyId: string,
  ) {
    return this.positionsService.listByCompanyGroupedByBusinessUnit(companyId);
  }

  @Permissions(PERMISSIONS.POSITIONS.READ)
  @Get()
  async findAll(
    @Query('businessUnitId') businessUnitId: string,
  ): Promise<ResponsePositionDto[]> {
    const result = businessUnitId
      ? await this.positionsService.findAllBybusinessUnitId(businessUnitId)
      : await this.positionsService.findAll();

    return result.map((p) => new ResponsePositionDto(p));
  }

  @Permissions(PERMISSIONS.POSITIONS.READ)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ResponsePositionDto> {
    const position = await this.positionsService.findById(id);
    return new ResponsePositionDto(position);
  }

  @Permissions(PERMISSIONS.POSITIONS.UPDATE)
  @SuccessMessage('Posición actualizada correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePositionDto,
    @UserId() userId: string,
  ): Promise<ResponsePositionDto> {
    const updated = await this.positionsService.update(id, dto, userId);
    return new ResponsePositionDto(updated);
  }

  @Permissions(PERMISSIONS.POSITIONS.DELETE)
  @SuccessMessage('Posición eliminada correctamente')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.positionsService.remove(id, userId);
  }
}
