import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { TermsService } from './terms.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SuccessMessage } from 'src/core/decorators/success-message.decorator';

@Controller('auth/terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get('current')
  async getCurrentTerms() {
    return this.termsService.getCurrentTerms();
  }

  @UseGuards(JwtAuthGuard)
  @Post('accept')
  @SuccessMessage('Términos y condiciones aceptados')
  async acceptTerms(@Req() req: any) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.termsService.acceptTerms(req.user.sub, ipAddress);
  }
}
