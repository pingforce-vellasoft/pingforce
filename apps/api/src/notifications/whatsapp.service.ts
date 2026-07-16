import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * WhatsApp Cloud API delivery (Master Plan Phase 2 — replaces the SMS
 * console stub for OTPs and shift alerts at near-zero cost).
 *
 * Env-gated: requires
 * - WHATSAPP_PHONE_NUMBER_ID
 * - WHATSAPP_ACCESS_TOKEN (permanent System User token from Meta Business)
 * Optional: WHATSAPP_API_VERSION (default v20.0)
 *
 * Free-form text is only deliverable inside a 24h customer-service window;
 * business-initiated messages (OTP, shift reminders) must use pre-approved
 * templates — use sendTemplate for those.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly phoneNumberId?: string;
  private readonly accessToken?: string;
  private readonly apiVersion: string;

  constructor(private readonly config: ConfigService) {
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    this.apiVersion = this.config.get<string>('WHATSAPP_API_VERSION', 'v20.0');

    if (this.isConfigured) {
      this.logger.log('WhatsApp Cloud API configured');
    } else {
      this.logger.warn(
        'WhatsApp Cloud API not configured — messages will be logged, not delivered',
      );
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.phoneNumberId && this.accessToken);
  }

  private get endpoint(): string {
    return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
  }

  /** Sends free-form text (24h service window only). Returns delivery handoff success. */
  async sendText(toPhoneE164: string, body: string): Promise<boolean> {
    return this.post({
      messaging_product: 'whatsapp',
      to: toPhoneE164,
      type: 'text',
      text: { body },
    });
  }

  /** Sends a pre-approved template message (business-initiated). */
  async sendTemplate(
    toPhoneE164: string,
    templateName: string,
    languageCode = 'en',
    bodyParameters: string[] = [],
  ): Promise<boolean> {
    return this.post({
      messaging_product: 'whatsapp',
      to: toPhoneE164,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components:
          bodyParameters.length > 0
            ? [
                {
                  type: 'body',
                  parameters: bodyParameters.map((text) => ({
                    type: 'text',
                    text,
                  })),
                },
              ]
            : undefined,
      },
    });
  }

  private async post(payload: Record<string, unknown>): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.log(
        `[WHATSAPP:simulated] ${JSON.stringify({
          to: payload.to,
          type: payload.type,
        })}`,
      );
      return true;
    }

    try {
      await axios.post(this.endpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      return true;
    } catch (error) {
      const detail = axios.isAxiosError(error)
        ? JSON.stringify(error.response?.data ?? error.message)
        : String(error);
      this.logger.error(`WhatsApp send failed to ${payload.to}: ${detail}`);
      return false;
    }
  }
}
