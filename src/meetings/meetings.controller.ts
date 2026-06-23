import {
  Controller, Post, Body, UseGuards, Get, Query, Param,
  ParseUUIDPipe, Patch, Delete, BadRequestException,
  Res, HttpStatus, ParseBoolPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { CreateMeetingDto, UpdateMeetingDto } from './dto';
import { CreateMinutesDto, UpdateMinutesDto, CreatePriorityFromMinutesDto } from './dto/minutes';
import { MeetingsService } from './services/meetings.service';
import { MeetingMinutesService } from './services/meeting-minutes.service';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly minutesService: MeetingMinutesService,
  ) {}

  @Post()
  @Permissions(PERMISSIONS.MEETINGS.CREATE)
  create(@Body() createMeetingDto: CreateMeetingDto, @UserId() actorId: string) {
    return this.meetingsService.create(createMeetingDto, actorId);
  }

  @Get('siblings/:parentId')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  async findSiblings(@Param('parentId') parentId: string) {
    return this.meetingsService.findSiblings(parentId);
  }

  @Get('calendar')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  async findForCalendar(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('companyId') companyId: string,
    @Query('businessUnitId') businessUnitId: string,
    @UserId() userId: string,
    @Query('onlyMine') onlyMine?: string,
  ) {
    const meetings = await this.meetingsService.findMyMeetings(userId, companyId);
    const [fy, fm, fd] = from.split('-').map(Number);
    const fromDate = new Date(fy, fm - 1, fd);
    const [ty, tm, td] = to.split('-').map(Number);
    const toDate = new Date(ty, tm - 1, td, 23, 59, 59, 999);
    return meetings
      .filter((m) => m.startDate >= fromDate && m.endDate <= toDate)
      .map((m) => ({
        id: m.id,
        meetingId: m.id,
        title: m.name,
        start: m.startDate.toISOString(),
        end: m.endDate.toISOString(),
        location: m.location,
      }));
  }

  @Get('my')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  findMyMeetings(@UserId() userId: string, @Query('companyId') companyId: string) {
    return this.meetingsService.findMyMeetings(userId, companyId);
  }

  @Get('company/:companyId/candidates')
  @Permissions(PERMISSIONS.MEETINGS.READ_USERS)
  async findCandidates(@Param('companyId') companyId: string) {
    return this.meetingsService.findCandidates(companyId);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.meetingsService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.MEETINGS.UPDATE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateMeetingDto: UpdateMeetingDto, @UserId() actorId: string) {
    return this.meetingsService.update(id, updateMeetingDto, actorId);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.MEETINGS.DELETE)
  @SuccessMessage('Reunión cancelada correctamente')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() actorId: string,
    @Query('applyToGroup', new ParseBoolPipe({ optional: true })) applyToGroup?: boolean,
  ) {
    await this.meetingsService.remove(id, actorId, applyToGroup);
  }

  // ---- Minutes (Actas) ----

  @Get(':id/minutes/versions')
  @Permissions(PERMISSIONS.MEETINGS.READ)
  async getMinutesVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.minutesService.findByMeetingId(id);
  }

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
    return this.minutesService.createPriority(id, dto, actorId);
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
      throw new BadRequestException('No hay acta para esta reunión');
    }
    const buffer = await this.minutesService.generatePdf(latest.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=acta-v${latest.version}.pdf`);
    res.status(HttpStatus.OK).send(buffer);
  }
}
