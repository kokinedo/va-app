export type EmailPayload = {
  recipient: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailProvider = {
  sendEmail(payload: EmailPayload): Promise<unknown>;
};
