import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export const PLAN_CHANGE_EFFECTS = [
  'IMMEDIATE',
  'NEXT_CYCLE',
  'HYBRID',
] as const;
export const PRORATION_MODES = ['NONE', 'FULL', 'UPFRONT_DIFFERENCE'] as const;
export const BILLING_DISPLAY_MODES = ['NONE', 'READ_ONLY', 'FULL'] as const;
export const APPROVER_QUEUE_MODES = [
  'ACCOUNT_MANAGER',
  'SHARED_QUEUE',
] as const;
export const POLICY_MODES = ['AUTO', 'APPROVAL', 'AUTO_WITH_LIMITS'] as const;

export class UpdatePortalSettingsDto {
  @IsOptional()
  @IsIn(PLAN_CHANGE_EFFECTS)
  readonly planChangeEffect?: string;

  @IsOptional()
  @IsIn(PRORATION_MODES)
  readonly prorationMode?: string;

  @IsOptional()
  @IsIn(BILLING_DISPLAY_MODES)
  readonly billingDisplayMode?: string;

  @IsOptional()
  @IsBoolean()
  readonly duesBlockAutoApproval?: boolean;

  @IsOptional()
  @IsIn(APPROVER_QUEUE_MODES)
  readonly approverQueueMode?: string;
}

export class UpsertServiceRequestPolicyDto {
  @IsString()
  readonly requestType!: string;

  @IsIn(POLICY_MODES)
  readonly mode!: string;

  @IsOptional()
  @IsObject()
  readonly limits?: Record<string, unknown>;
}
