import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
    });
  }

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    const from = process.env.SMTP_FROM || '"Cloud POS" <no-reply@cloudpos.com>';
    try {
      this.logger.log(`Enviando correo a: ${to} - Asunto: ${subject}`);
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      this.logger.log(`Correo enviado exitosamente a ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando correo a ${to}:`, error);
      return false; // Retornar false de forma segura para no interrumpir el flujo si el SMTP falla
    }
  }
}
