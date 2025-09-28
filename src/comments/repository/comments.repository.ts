// src/comments/repositories/comments.repository.ts
import { Injectable } from '@nestjs/common';
import { Comment } from '@prisma/client';
import { CommentEntity } from '../entities/comment.entity';
import { CreateCommentDto, UpdateCommentDto } from '../dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCommentDto, userId: string): Promise<CommentEntity> {
    const row = await this.prisma.comment.create({
      data: {
        name: dto.name,
        moduleShortcode: dto.moduleShortcode ?? null,
        referenceId: dto.referenceId,
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    return new CommentEntity(row);
  }

  async update(
    id: string,
    dto: UpdateCommentDto,
    userId: string,
  ): Promise<CommentEntity> {
    const data: Partial<Comment> = {
      updatedBy: userId,
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.moduleShortcode !== undefined
        ? { moduleShortcode: dto.moduleShortcode ?? null }
        : {}),
    };
    const row = await this.prisma.comment.update({ where: { id }, data });
    return new CommentEntity(row);
  }

  async inactivate(id: string, userId: string): Promise<void> {
    await this.prisma.comment.update({
      where: { id },
      data: { isActive: false, updatedBy: userId },
    });
  }

  async findByTarget(
    referenceId: string,
    moduleShortcode?: string | null,
    onlyActive = true,
  ): Promise<CommentEntity[]> {
    const where: any = {
      referenceId,
      ...(moduleShortcode !== undefined
        ? { moduleShortcode: moduleShortcode ?? null }
        : {}),
      ...(onlyActive ? { isActive: true } : {}),
    };
    const rows = await this.prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => new CommentEntity(r));
  }

  async findById(id: string): Promise<CommentEntity | null> {
    const row = await this.prisma.comment.findUnique({ where: { id } });
    return row ? new CommentEntity(row) : null;
  }
}
