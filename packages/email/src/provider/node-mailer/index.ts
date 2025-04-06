import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import { type EmailPayload, type EmailProvider } from '../types';
import { nodeMailerOptions } from './node-mailer-options';

export default {
  async sendEmail(
    payload: EmailPayload
  ): Promise<SMTPTransport.SentMessageInfo> {
    return await nodemailer
      .createTransport(nodeMailerOptions.transport)
      .sendMail({
        from: nodeMailerOptions.from,
        to: payload.recipient,
        subject: payload.subject,
        html: payload.html,
        text: payload.text
      });
  }
} satisfies EmailProvider;
