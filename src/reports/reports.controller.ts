import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/core/guards/permissions.guard';
import { Permissions } from 'src/core/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/common/constants/permissions.constant';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { ReportsService } from './reports.service';
import { DefinitionsReportDto } from './dto/definitions-report.dto';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function yyyymmdd(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Permissions(PERMISSIONS.STRATEGIC_PLANS.READ)
  @Post('strategic-plans/definitions/pdf')
  async generateDefinitionsPdf(
    @Body() dto: DefinitionsReportDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.reportsService.generateDefinitionsPdf(dto);

    const today = new Date();
    const filename = `definiciones-estrategicas-${yyyymmdd(today)}.pdf`;

    res.status(HttpStatus.OK);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(pdfBuffer);
  }
}
