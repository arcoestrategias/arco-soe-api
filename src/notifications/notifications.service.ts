import { BadRequestException, Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { MailService } from 'src/mail/mail.service';
import { NotificationTemplateRepository } from './repositories/notification-template.repository';

@Injectable()
export class NotificationService {
  constructor(
    private readonly mail: MailService,
    private readonly templates: NotificationTemplateRepository,
  ) {}

  async sendByCode(params: {
    codeTemplate: string; // ej: 'ACC'
    to: string | string[];
    variables?: Record<string, any>; // { firstname: 'Ana', link: '...' }
    from?: string;
  }) {
    const tpl = await this.templates.findByCode(params.codeTemplate);
    if (!tpl) throw new BadRequestException('Template not found');

    const subject = compileHB(tpl.subject ?? '', params.variables);
    const html = compileHB(tpl.template ?? '', params.variables);

    const info = await this.mail.send({
      to: params.to,
      subject,
      html,
      from: params.from,
    });

    return { messageId: info.messageId };
  }
}

function compileHB(source: string, vars: Record<string, any> = {}) {
  const compiled = Handlebars.compile(source, { noEscape: true });
  return compiled(vars);
}
