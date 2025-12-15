import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  Patch,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { CalendarQueryDto, CreateMeetingDto, UpdateMeetingDto } from './dto';
import { MeetingsService } from './services/meetings.service';
import { MeetingOccurrenceService } from './services/meeting-occurrence.service';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly occurrenceService: MeetingOccurrenceService,
  ) {}

  @Post()
  create(
    @Body() createMeetingDto: CreateMeetingDto,
    @UserId() actorId: string,
  ) {
    return this.meetingsService.create(createMeetingDto, actorId);
  }

  @Get('my')
  findMyMeetings(
    @UserId() userId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.meetingsService.findMyMeetings(userId, companyId);
  }

  @Get('calendar')
  findForCalendar(
    @Query() query: CalendarQueryDto,
    @Query('companyId') companyId: string,
    @Query('businessUnitId') businessUnitId: string,
    @UserId() userId: string,
  ) {
    const actorId = query.onlyMine ? userId : undefined;
    // Nota: Debes actualizar el servicio MeetingOccurrenceService para aceptar estos nuevos parámetros
    return (this.occurrenceService as any).findForCalendar(
      query.from,
      query.to,
      actorId,
      companyId,
      businessUnitId,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.meetingsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @UserId() actorId: string,
  ) {
    return this.meetingsService.update(id, updateMeetingDto, actorId);
  }

  @Delete(':id')
  @SuccessMessage('Reunión cancelada correctamente')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('scope') scope: 'SERIES' | 'ONLY_THIS',
    @Query('occurrenceDate') occurrenceDate: string,
    @UserId() actorId: string,
  ) {
    if (scope === 'ONLY_THIS' && !occurrenceDate) {
      throw new BadRequestException(
        'Para cancelar una sola ocurrencia se requiere el parámetro occurrenceDate',
      );
    }
    await this.meetingsService.remove(
      id,
      scope || 'SERIES',
      occurrenceDate,
      actorId,
    );
  }

  @Patch('occurrences/:id/execute')
  @SuccessMessage('Reunión marcada como ejecutada')
  async markAsExecuted(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() actorId: string,
  ) {
    await this.meetingsService.markOccurrenceAsExecuted(id, actorId);
  }
}
