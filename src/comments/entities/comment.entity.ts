export class CommentEntity {
  readonly id: string;
  readonly name: string;
  readonly moduleShortcode?: string | null;
  readonly referenceId: string;

  readonly isActive: boolean;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(comment: any) {
    this.id = comment.id;
    this.name = comment.name;
    this.moduleShortcode = comment.moduleShortcode ?? null;
    this.referenceId = comment.referenceId;

    this.isActive = comment.isActive;
    this.createdBy = comment.createdBy ?? null;
    this.updatedBy = comment.updatedBy ?? null;
    this.createdAt = comment.createdAt;
    this.updatedAt = comment.updatedAt;
  }
}
