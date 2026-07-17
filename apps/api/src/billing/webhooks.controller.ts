import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { GatewayName } from './providers/provider-registry.service';

/**
 * Gateway webhook receiver. Authentication is by signature verification against
 * the raw request body (see WebhooksService), so no JWT guard applies. Requires
 * `rawBody: true` on the Nest app (set in main.ts) so the buffer is available.
 */
@Controller('billing/webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post(':gateway')
  @HttpCode(200)
  async receive(
    @Param('gateway') gateway: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') razorpaySignature?: string,
    @Headers('stripe-signature') stripeSignature?: string,
  ) {
    const name = gateway.toUpperCase();
    if (name !== 'RAZORPAY' && name !== 'STRIPE') {
      throw new BadRequestException(`Unknown gateway: ${gateway}`);
    }
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw request body');
    }
    const signature =
      name === 'RAZORPAY' ? razorpaySignature : stripeSignature;
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }
    return this.webhooks.handle(name as GatewayName, rawBody, signature);
  }
}
