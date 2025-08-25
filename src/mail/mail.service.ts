import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT ?? 587),
      secure: String(process.env.MAIL_SECURE ?? 'false') === 'true', // 587 => false
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_USER_PWD,
      },
      requireTLS: true,
      pool: true, // pooling para prod
      maxConnections: 3,
      maxMessages: 100,
    });

    // verificación al arrancar (log solamente)
    this.transporter.verify((err, ok) => {
      if (err) this.logger.error('SMTP verify failed', err as any);
      else this.logger.log('SMTP transporter is ready');
    });
  }

  async send(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
  }) {
    const from =
      options.from ?? process.env.MAIL_FROM ?? process.env.MAIL_USER!;
    return this.transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }
}
