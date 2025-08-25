export class FileEntity {
  readonly id: string;
  readonly fieldName?: string | null;
  readonly description?: string | null;
  readonly originalName?: string | null;
  readonly encoding?: string | null;
  readonly mimeType?: string | null;
  readonly destination?: string | null;
  readonly fileName?: string | null;
  readonly path?: string | null;
  readonly sizeByte?: number | null;
  readonly extension?: string | null;
  readonly icon?: string | null;
  readonly moduleShortcode?: string | null;
  readonly referenceId?: string | null;
  readonly screenKey?: string | null;

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(file: any) {
    this.id = file.id;
    this.fieldName = file.fieldName ?? null;
    this.description = file.description ?? null;
    this.originalName = file.originalName ?? null;
    this.encoding = file.encoding ?? null;
    this.mimeType = file.mimeType ?? null;
    this.destination = file.destination ?? null;
    this.fileName = file.fileName ?? null;
    this.path = file.path ?? null;
    this.sizeByte = file.sizeByte ?? null;
    this.extension = file.extension ?? null;
    this.icon = file.icon ?? null;
    this.moduleShortcode = file.moduleShortcode ?? null;
    this.referenceId = file.referenceId ?? null;
    this.screenKey = file.screenKey ?? null;

    this.isActive = file.isActive;
    this.createdBy = file.createdBy ?? null;
    this.updatedBy = file.updatedBy ?? null;
    this.createdAt = file.createdAt;
    this.updatedAt = file.updatedAt;
  }
}
