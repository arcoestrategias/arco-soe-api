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
  NotFoundException,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { CalendarQueryDto, CreateMeetingDto, UpdateMeetingDto } from './dto';
import { CreateMinutesDto, UpdateMinutesDto, CreatePriorityFromMinutesDto } from './dto/minutes';
import { MeetingsService } from './services/meetings.service';
import { MeetingMinutesService } from './services/meeting-minutes.service';
import { MeetingOccurrenceService } from './services/meeting-occurrence.service';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly occurrenceService: MeetingOccurrenceService,
    private readonly minutesService: MeetingMinutesService,
  ) {}

  @Post()
  @Permissions(PERMISSIONS.MEETINGS.CREATE)
  create(
    @Body() createMeetingDto: CreateMeetingDto,
    @UserId() actorId: string,
  ) {
    return this.meetingsService.create(createMeetingDto, actorId);
  }

  @Get('my')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  findMyMeetings(
    @UserId() userId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.meetingsService.findMyMeetings(userId, companyId);
  }

  @Get('calendar')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  findForCalendar(
    @Query() query: CalendarQueryDto,
    @Query('companyId') companyId: string,
    @Query('businessUnitId') businessUnitId: string,
    @UserId() userId: string,
  ) {
    const actorId = query.onlyMine ? userId : undefined;
    return this.occurrenceService.findForCalendar(
      query.from,
      query.to,
      actorId,
      companyId,
      businessUnitId,
    );
  }

  @Get(':id')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.meetingsService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.MEETINGS.UPDATE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @UserId() actorId: string,
  ) {
    return this.meetingsService.update(id, updateMeetingDto, actorId);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.MEETINGS.DELETE)
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

  @Get('company/:companyId/candidates')
  @Permissions(PERMISSIONS.MEETINGS.READ_USERS)
  async findCandidates(@Param('companyId') companyId: string) {
    return this.meetingsService.findCandidates(companyId);
  }

  // ---- Minutes (Actas) ----

  @Get(':id/minutes')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  async getMinutes(@Param('id', ParseUUIDPipe) id: string) {
    return this.minutesService.findLatestByMeetingId(id);
  }

  @Post(':id/minutes')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  @SuccessMessage('Borrador de acta creado')
  async createMinutes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMinutesDto,
    @UserId() actorId: string,
  ) {
    return this.minutesService.create(id, actorId, dto.agenda);
  }

  @Patch(':id/minutes')
  @Permissions(PERMISSIONS.MEETINGS.UPDATE)
  @SuccessMessage('Borrador guardado')
  async updateMinutes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMinutesDto,
    @UserId() actorId: string,
  ) {
    return this.minutesService.updateDraft(id, actorId, dto as any);
  }

  @Post(':id/minutes/finalize')
  @Permissions(PERMISSIONS.MEETINGS.UPDATE)
  @SuccessMessage('Acta finalizada')
  async finalizeMinutes(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() actorId: string,
  ) {
    return this.minutesService.finalize(id, actorId);
  }

  @Post(':id/priorities')
  @Permissions(PERMISSIONS.MEETINGS.CREATE_PRIORITY)
  @SuccessMessage('Prioridad creada desde acta')
  async createPriorityFromMinutes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePriorityFromMinutesDto,
    @UserId() actorId: string,
  ) {
    return this.minutesService.createPriority(
      id,
      dto,
      actorId,
    );
  }

  @Get(':id/priorities-today')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  async getPrioritiesToday(@Param('id', ParseUUIDPipe) id: string) {
    return this.minutesService.listPrioritiesToday(id);
  }

  @Get(':id/participants-performance')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  async getParticipantsPerformance(@Param('id', ParseUUIDPipe) id: string) {
    return this.minutesService.getParticipantsPerformance(id);
  }

  @Post(':id/minutes/pdf')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  async exportMinutesPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const latest = await this.minutesService.findLatestByMeetingId(id);
    if (!latest) {
      throw new NotFoundException('No hay acta para esta reunión');
    }
    const buffer = await this.minutesService.generatePdf(latest.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=acta-v${latest.version}.pdf`,
    );
    res.status(HttpStatus.OK).send(buffer);
  }

  @Patch('occurrences/:id/execute')
  @Permissions(PERMISSIONS.MEETINGS.UPDATE)
  @SuccessMessage('Reunión marcada como ejecutada')
  async markAsExecuted(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() actorId: string,
  ) {
    await this.meetingsService.markOccurrenceAsExecuted(id, actorId);
  }
}
