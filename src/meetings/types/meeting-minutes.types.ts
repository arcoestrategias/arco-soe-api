export type MinutesStatus = 'DRAFT' | 'FINALIZED';

export interface MinutesPerformance {
  ico: number;
  icp: number;
  performance: number;
  avance: number;
}

export interface MinutesPrioritySnapshot {
  id: string;
  name: string;
  status: string;
  monthlyClass?: string;
  untilAt?: string;
  finishedAt?: string;
  canceledAt?: string;
  fromAt?: string;
  createdAt?: string;
  objectiveName?: string;
  description?: string;
}

export interface MinutesPosition {
  positionId: string;
  positionName: string;
  userName: string;
  performance: MinutesPerformance | null;
  priorities: MinutesPrioritySnapshot[];
}

export interface MinutesAttendance {
  userId: string;
  userName: string;
  present: boolean;
  isRequired: boolean;
  role: string;
}

export interface MeetingMinutesData {
  agenda: string[];
  positions: MinutesPosition[];
  attendance: MinutesAttendance[];
  observations: string;
  finalizedAt?: string;
}

export interface MinutesResponse {
  id: string;
  meetingId: string;
  version: number;
  status: MinutesStatus;
  data: MeetingMinutesData;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
