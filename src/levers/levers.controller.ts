import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  CreateLeverDto,
  UpdateLeverDto,
  ResponseLeverDto,
  ReorderLeverWrapperDto,
} from './dto';
import { LeversService } from './levers.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';

@Controller('levers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeversController {
  constructor(private readonly leversService: LeversService) {}

  @Permissions(PERMISSIONS.LEVERS.CREATE)
  @SuccessMessage('Palanca creada exitosamente')
  @Post()
  async create(
    @Body() dto: CreateLeverDto,
    @UserId() userId: string,
  ): Promise<ResponseLeverDto> {
    const created = await this.leversService.create(dto, userId);
    return new ResponseLeverDto(created);
  }

  @Permissions(PERMISSIONS.LEVERS.READ)
  @Get()
  async findAll(
    @Query('positionId') positionId: string,
  ): Promise<ResponseLeverDto[]> {
    const list = await this.leversService.findAll(positionId);
    return list.map((e) => new ResponseLeverDto(e));
  }

  @Permissions(PERMISSIONS.LEVERS.READ)
  @Get(':id')
  async findById(@Param('id') id: string): Promise<ResponseLeverDto> {
    const item = await this.leversService.findById(id);
    return new ResponseLeverDto(item);
  }

  @Permissions(PERMISSIONS.LEVERS.UPDATE, PERMISSIONS.LEVERS.REORDER)
  @SuccessMessage('Orden actualizado correctamente')
  @Patch('reorder')
  async reorder(
    @Body() dto: ReorderLeverWrapperDto,
    @UserId() userId: string,
  ): Promise<void> {
    await this.leversService.reorder(dto, userId);
  }

  @Permissions(PERMISSIONS.LEVERS.UPDATE)
  @SuccessMessage('Palanca actualizada correctamente')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeverDto,
    @UserId() userId: string,
  ): Promise<ResponseLeverDto> {
    const updated = await this.leversService.update(id, dto, userId);
    return new ResponseLeverDto(updated);
  }

  @Permissions(PERMISSIONS.LEVERS.DELETE)
  @SuccessMessage('Palanca eliminada correctamente')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.leversService.remove(id, userId);
  }
}
