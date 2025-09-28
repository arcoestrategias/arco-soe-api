// src/comments/comments.service.ts
import { Injectable } from '@nestjs/common';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { CommentEntity } from './entities/comment.entity';
import { CommentsRepository } from './repository/comments.repository';

@Injectable()
export class CommentsService {
  constructor(private readonly repo: CommentsRepository) {}

  create(dto: CreateCommentDto, userId: string): Promise<CommentEntity> {
    return this.repo.create(dto, userId);
  }

  update(
    id: string,
    dto: UpdateCommentDto,
    userId: string,
  ): Promise<CommentEntity> {
    return this.repo.update(id, dto, userId);
  }

  inactivate(id: string, userId: string): Promise<void> {
    return this.repo.inactivate(id, userId);
  }

  listByTarget(
    referenceId: string,
    moduleShortcode?: string,
  ): Promise<CommentEntity[]> {
    return this.repo.findByTarget(referenceId, moduleShortcode, true);
  }

  findById(id: string): Promise<CommentEntity | null> {
    return this.repo.findById(id);
  }
}
