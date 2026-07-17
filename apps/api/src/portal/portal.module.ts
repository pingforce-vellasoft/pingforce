import { Module } from '@nestjs/common';
import { SlaComputationService } from '@pingforce-monorepo/shared';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PortalAuthController } from './auth/portal-auth.controller';
import { PortalAuthService } from './auth/portal-auth.service';
import { PortalOtpService } from './auth/portal-otp.service';
import { PortalInvitesController } from './invites/portal-invites.controller';
import { PortalInvitesService } from './invites/portal-invites.service';
import { PortalMeController } from './me/portal-me.controller';
import { PortalMeService } from './me/portal-me.service';
import { PortalFaultsController } from './faults/portal-faults.controller';
import { PortalFaultsService } from './faults/portal-faults.service';
import { PortalFeatureGuard } from './guards/portal-feature.guard';
import { PortalUserGuard } from './guards/portal-user.guard';
import { PortalAccessController } from './portal-access.controller';
import { CatalogService } from './catalog/catalog.service';
import { CatalogController } from './catalog/catalog.controller';
import { CatalogPortalController } from './catalog/catalog-portal.controller';
import { ServiceRequestsService } from './service-requests/service-requests.service';
import { PortalSettingsService } from './service-requests/portal-settings.service';
import { ServiceRequestsPortalController } from './service-requests/service-requests-portal.controller';
import { ServiceRequestsStaffController } from './service-requests/service-requests-staff.controller';

/**
 * Customer Portal module (3.8_CustomerPortal): end-user identity, invites,
 * self-service account/connection reads and the customer fault register.
 * Customer-facing routes live under /api/v1/portal/**; staff-side portal
 * user management under /api/v1/customers/:customerId/portal/**.
 */
@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [
    PortalAuthController,
    PortalInvitesController,
    PortalMeController,
    PortalFaultsController,
    PortalAccessController,
    CatalogController,
    CatalogPortalController,
    ServiceRequestsPortalController,
    ServiceRequestsStaffController,
  ],
  providers: [
    PortalAuthService,
    PortalOtpService,
    PortalInvitesService,
    PortalMeService,
    PortalFaultsService,
    SlaComputationService,
    PortalFeatureGuard,
    PortalUserGuard,
    CatalogService,
    ServiceRequestsService,
    PortalSettingsService,
  ],
  exports: [PortalFeatureGuard],
})
export class PortalModule {}
