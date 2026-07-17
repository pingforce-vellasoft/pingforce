import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Public checkout request from the website pricing page. A tenant is not
 * required to exist yet — this captures intent and starts a gateway
 * subscription; the tenant is provisioned/linked when payment succeeds.
 */
export class CreateCheckoutDto {
  /** Plan.code selected on the pricing page. */
  @IsString()
  @MaxLength(50)
  readonly planCode!: string;

  @IsEmail()
  readonly customerEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly organizationName?: string;

  /** Optional: link checkout to an existing tenant (super-admin flows). */
  @IsOptional()
  @IsString()
  readonly tenantId?: string;

  /** Override the gateway; defaults to the first configured one. */
  @IsOptional()
  @IsIn(['RAZORPAY', 'STRIPE'])
  readonly gateway?: 'RAZORPAY' | 'STRIPE';
}
