import { api } from './apiService';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  filename?: string;
  fileBase64?: string;
}

export interface WhatsAppPayload {
  to: string;
  body: string;
  mediaUrl?: string;
}

export async function sendEmail(payload: EmailPayload) {
  return api.sendEmail(payload);
}

export async function sendWhatsApp(payload: WhatsAppPayload) {
  return api.sendWhatsApp(payload);
}
