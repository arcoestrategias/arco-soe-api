import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import { ProjectParticipantService } from './project-participant.service';
import { CreateProjectParticipantDto } from './dto/create-project-participant.dto';
import { UpdateProjectParticipantDto } from './dto/update-project-participant.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { ListProjectParticipantsDto } from './dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('project-participants')
export class ProjectParticipantController {
  constructor(private readonly service: ProjectParticipantService) {}

  @Permissions(PERMISSIONS.PROJECT_PARTICIPANTS.CREATE)
  @Post()
  create(@Body() dto: CreateProjectParticipantDto, @UserId() userId: string) {
    return this.service.create(dto, userId);
  }

  @Permissions(PERMISSIONS.PROJECT_PARTICIPANTS.READ)
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  // Listar por proyecto
  @Permissions(PERMISSIONS.PROJECT_PARTICIPANTS.READ)
  @Get()
  list(@Query() q: ListProjectParticipantsDto) {
    const { projectId, positionId, page, limit, isActive } = q;

    if (positionId) {
      return this.service.listByPosition(positionId, { page, limit, isActive });
    }

    // si no envían projectId y tampoco positionId, podrías lanzar BadRequest o definir un default
    return this.service.listByProject(projectId!, { page, limit, isActive });
  }

  @Permissions(PERMISSIONS.PROJECT_PARTICIPANTS.UPDATE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectParticipantDto,
    @UserId() userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Permissions(PERMISSIONS.PROJECT_PARTICIPANTS.DELETE)
  @Patch(':id/active')
  toggleActive(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @UserId() userId: string,
  ) {
    return this.service.setActive(id, Boolean(body?.isActive), userId);
  }
}
