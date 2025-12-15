import { Injectable } from '@nestjs/common';
import { MeetingOccurrencesRepository } from '../repositories/meeting-occurrences.repository';

@Injectable()
export class MeetingOccurrenceService {
  constructor(private readonly occurrencesRepo: MeetingOccurrencesRepository) {}

  async findForCalendar(
    from: string,
    to: string,
    userId?: string,
    companyId?: string,
    businessUnitId?: string,
  ) {
    const occurrences = await this.occurrencesRepo.findForCalendar(
      new Date(from),
      new Date(to),
      userId,
      companyId,
      businessUnitId,
    );

    // Mapear a una respuesta limpia para el frontend
    return occurrences.map((occ) => ({
      id: occ.id,
      meetingId: occ.meeting.id,
      title: occ.meeting.name,
      start: occ.startDate.toISOString(),
      end: occ.endDate.toISOString(),
      location: occ.meeting.location,
      isExecuted: occ.isExecuted,
      isCancelled: occ.isCancelled,
    }));
  }
}
