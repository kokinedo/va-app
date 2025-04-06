import { Resend, type CreateEmailResponse } from 'resend';

import { keys } from '../../../keys';
import { type EmailPayload, type EmailProvider } from '../types';
import { resendOptions } from './resend-options';

const resend = new Resend(keys().EMAIL_RESEND_API_KEY!);

export default {
  async sendEmail(payload: EmailPayload): Promise<CreateEmailResponse> {
    const response = await resend.emails.send({
      from: resendOptions.from,
      to: payload.recipient,
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    });
    if (response.error) {
      throw Error(response.error.message ?? 'Could not send mail.');
    }

    return response;
  }
} satisfies EmailProvider;
