import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/navigation/nav_destinations.dart';

/// Route-level RBAC unit tests (pure Dart — no widget tree).
///
/// Guards the fix for the mobile role-gating gap: the bottom nav only *hides*
/// tabs, so `permissionsFor` / `roleHasPermission` / `permissionKeyForRoute`
/// are the actual enforcement surface used by RouteGuard and the More sheet.
void main() {
  group('permissionsFor', () {
    test('every role carries the common shell permissions', () {
      // attendance.view is NOT common — it is field-only (check-in is for roles
      // that move between sites). See the field-attendance test below.
      for (final role in AppUserRole.values) {
        final perms = NavDestinations.permissionsFor(role);
        expect(perms, containsAll(<String>{
          'home.view',
          'profile.view',
          'settings.view',
          'leave.view',
        }), reason: '$role missing a common permission');
      }
    });

    test('attendance.view is field-only (field roles yes, office/customer no)',
        () {
      for (final role in const [
        AppUserRole.fieldEmployee,
        AppUserRole.fieldTechnician,
        AppUserRole.salesRep,
      ]) {
        expect(NavDestinations.permissionsFor(role), contains('attendance.view'),
            reason: '$role should carry attendance.view');
      }
      for (final role in const [
        AppUserRole.manager,
        AppUserRole.admin,
        AppUserRole.customer,
      ]) {
        expect(NavDestinations.permissionsFor(role),
            isNot(contains('attendance.view')),
            reason: '$role must not carry attendance.view');
      }
    });

    test('field employee gets visits but not faults/leads/team/reports', () {
      final perms = NavDestinations.permissionsFor(AppUserRole.fieldEmployee);
      expect(perms, contains('visits.view'));
      expect(perms, isNot(contains('faults.view')));
      expect(perms, isNot(contains('leads.view')));
      expect(perms, isNot(contains('team.view')));
      expect(perms, isNot(contains('reports.view')));
    });

    test('technician gets faults, not visits/leads', () {
      final perms = NavDestinations.permissionsFor(AppUserRole.fieldTechnician);
      expect(perms, contains('faults.view'));
      expect(perms, isNot(contains('visits.view')));
      expect(perms, isNot(contains('leads.view')));
    });

    test('sales rep gets leads only among feature perms', () {
      final perms = NavDestinations.permissionsFor(AppUserRole.salesRep);
      expect(perms, contains('leads.view'));
      expect(perms, isNot(contains('faults.view')));
      expect(perms, isNot(contains('team.view')));
    });

    test('manager gets team + reports, not sales/field feature perms', () {
      final perms = NavDestinations.permissionsFor(AppUserRole.manager);
      expect(perms, containsAll(<String>{'team.view', 'reports.view'}));
      expect(perms, isNot(contains('leads.view')));
      expect(perms, isNot(contains('faults.view')));
    });

    test('admin can reach every feature route', () {
      final perms = NavDestinations.permissionsFor(AppUserRole.admin);
      expect(perms, containsAll(<String>{
        'team.view',
        'reports.view',
        'leads.view',
        'faults.view',
        'visits.view',
      }));
    });
  });

  group('roleHasPermission', () {
    test('empty key (More sentinel) is always allowed', () {
      for (final role in AppUserRole.values) {
        expect(NavDestinations.roleHasPermission(role, ''), isTrue);
      }
    });

    test('denies a field employee the reports screen', () {
      expect(
        NavDestinations.roleHasPermission(
            AppUserRole.fieldEmployee, 'reports.view'),
        isFalse,
      );
    });

    test('grants a manager the reports screen', () {
      expect(
        NavDestinations.roleHasPermission(AppUserRole.manager, 'reports.view'),
        isTrue,
      );
    });
  });

  group('permissionKeyForRoute', () {
    test('maps feature roots to their permission key', () {
      expect(NavDestinations.permissionKeyForRoute('/reports'),
          'reports.view');
      expect(NavDestinations.permissionKeyForRoute('/team'), 'team.view');
      expect(NavDestinations.permissionKeyForRoute('/leads'), 'leads.view');
      expect(NavDestinations.permissionKeyForRoute('/faults'), 'faults.view');
      expect(NavDestinations.permissionKeyForRoute('/visits'), 'visits.view');
      expect(NavDestinations.permissionKeyForRoute('/attendance'),
          'attendance.view');
    });

    test('child routes inherit the parent gate', () {
      expect(
          NavDestinations.permissionKeyForRoute('/faults/new'), 'faults.view');
      expect(NavDestinations.permissionKeyForRoute('/faults/abc-123'),
          'faults.view');
      expect(NavDestinations.permissionKeyForRoute('/reports/q3'),
          'reports.view');
      expect(NavDestinations.permissionKeyForRoute('/attendance/check-in'),
          'attendance.view');
    });

    test('non-restricted routes return null (never bounced)', () {
      expect(NavDestinations.permissionKeyForRoute('/home'), isNull);
      expect(NavDestinations.permissionKeyForRoute('/profile'), isNull);
      expect(NavDestinations.permissionKeyForRoute('/settings'), isNull);
    });

    test('a prefix collision does not false-match (/teamwork ≠ /team)', () {
      // /team gates only /team and /team/*, not an unrelated /teamwork route.
      expect(NavDestinations.permissionKeyForRoute('/teamwork'), isNull);
    });
  });

  group('end-to-end: role cannot reach a foreign feature route', () {
    ({bool bounced}) simulateGuard(AppUserRole role, String location) {
      final key = NavDestinations.permissionKeyForRoute(location);
      if (key == null) return (bounced: false);
      return (bounced: !NavDestinations.roleHasPermission(role, key));
    }

    test('field employee deep-linking to /reports is bounced', () {
      expect(simulateGuard(AppUserRole.fieldEmployee, '/reports').bounced,
          isTrue);
    });

    test('field employee reaching /visits is allowed', () {
      expect(simulateGuard(AppUserRole.fieldEmployee, '/visits').bounced,
          isFalse);
    });

    test('technician deep-linking to /leads is bounced', () {
      expect(
          simulateGuard(AppUserRole.fieldTechnician, '/leads').bounced, isTrue);
    });

    test('admin reaches every feature route', () {
      for (final loc in ['/reports', '/team', '/leads', '/faults', '/visits']) {
        expect(simulateGuard(AppUserRole.admin, loc).bounced, isFalse,
            reason: 'admin bounced from $loc');
      }
    });
  });

  group('customer is a portal identity — no field features', () {
    ({bool bounced}) simulateGuard(AppUserRole role, String location) {
      final key = NavDestinations.permissionKeyForRoute(location);
      if (key == null) return (bounced: false);
      return (bounced: !NavDestinations.roleHasPermission(role, key));
    }

    test('carries only the common shell perms, no field features', () {
      final perms = NavDestinations.permissionsFor(AppUserRole.customer);
      expect(perms, containsAll(<String>{
        'home.view',
        'profile.view',
        'settings.view',
        'leave.view',
      }));
      for (final key in const [
        'visits.view',
        'faults.view',
        'leads.view',
        'team.view',
        'reports.view',
        'attendance.view',
      ]) {
        expect(perms, isNot(contains(key)), reason: 'customer has $key');
      }
    });

    test('bottom nav is Home only', () {
      final nav = NavDestinations.bottomNavFor(role: AppUserRole.customer);
      expect(nav.map((d) => d.id).toList(), [NavDestinationId.home]);
    });

    test('bounced from field routes (/visits, /attendance)', () {
      expect(simulateGuard(AppUserRole.customer, '/visits').bounced, isTrue);
      expect(simulateGuard(AppUserRole.customer, '/attendance').bounced, isTrue);
    });
  });
}
