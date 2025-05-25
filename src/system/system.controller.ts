import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class SystemController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
