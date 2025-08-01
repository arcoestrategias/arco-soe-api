import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const BusinessUnitId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-business-unit-id'];
  },
);
