import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto, ResponseCommentDto } from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';
import { UsersService } from 'src/users/users.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('comments')
export class CommentsController {
  constructor(
    private readonly service: CommentsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @SuccessMessage('Nota creada exitosamente')
  async create(
    @Body() dto: CreateCommentDto,
    @Req() req: any,
  ): Promise<ResponseCommentDto> {
    const userId: string = req.user?.sub;
    const e = await this.service.create(dto, userId);
    return this.buildResponse(
      e,
      await this.fetchNames([e.createdBy, e.updatedBy]),
    );
  }

  @Patch(':id')
  @SuccessMessage('Nota actualizada correctamente')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: any,
  ): Promise<ResponseCommentDto> {
    const userId: string = req.user?.sub;
    const e = await this.service.update(id, dto, userId);
    return this.buildResponse(
      e,
      await this.fetchNames([e.createdBy, e.updatedBy]),
    );
  }

  @Patch(':id/inactivate')
  @SuccessMessage('Comentario inactivado correctamente')
  async inactivate(@Param('id') id: string, @Req() req: any): Promise<void> {
    const userId: string = req.user?.sub;
    await this.service.inactivate(id, userId);
  }

  @Get()
  async list(
    @Query('referenceId') referenceId: string,
    @Query('moduleShortcode') moduleShortcode?: string,
  ): Promise<ResponseCommentDto[]> {
    const rows = await this.service.listByTarget(referenceId, moduleShortcode);
    const nameMap = await this.fetchNames(
      rows.flatMap((r) => [r.createdBy, r.updatedBy]),
    );
    return rows.map((r) => this.buildResponse(r, nameMap));
  }

  // ===== helpers =====
  private async fetchNames(userIds: (string | null | undefined)[]) {
    const ids = Array.from(new Set(userIds.filter((x): x is string => !!x)));
    if (!ids.length) return new Map<string, string>();

    // Usa tu UsersService.findOne(id) y el getter fullName del UserEntity
    const pairs = await Promise.all(
      ids.map(async (id) => {
        try {
          const u = await this.usersService.findOne(id);
          const fullName = (u as any).fullName ?? '';
          return [id, fullName] as const;
        } catch {
          return [id, ''] as const;
        }
      }),
    );

    return new Map(pairs);
  }

  private formatLabelDate(d: Date): string {
    const map = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sept',
      'Oct',
      'Nov',
      'Dec',
    ];
    const h = d.toLocaleTimeString('en-US', { hour12: true });
    return `${map[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${h}`;
  }

  private buildResponse(
    e: any,
    names: Map<string, string>,
  ): ResponseCommentDto {
    const createdName = e.createdBy ? (names.get(e.createdBy) ?? '') : '';
    const updatedName = e.updatedBy ? (names.get(e.updatedBy) ?? '') : '';
    return {
      id: e.id,
      labelCreatedBy: `Se ingresó una nota de ${createdName || 'Usuario desconocido'}`,
      labelCreatedAt: this.formatLabelDate(e.createdAt),
      labelUpdatedBy: `Última actualización realizada por: ${updatedName || 'Usuario desconocido'}`,
      labelUpdatedAt: this.formatLabelDate(e.updatedAt),
      name: e.name,
      isActive: e.isActive,
    };
  }
}
