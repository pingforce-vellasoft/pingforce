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
      for (final role in AppUserRole.values) {
        final perms = NavDestinations.permissionsFor(role);
        expect(perms, containsAll(<String>{
          'home.view',
          'attendance.view',
          'profile.view',
          'settings.view',
          'leave.view',
        }), reason: '$role missing a common permission');
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
    });

    test('child routes inherit the parent gate', () {
      expect(
          NavDestinations.permissionKeyForRoute('/faults/new'), 'faults.view');
      expect(NavDestinations.permissionKeyForRoute('/faults/abc-123'),
          'faults.view');
      expect(NavDestinations.permissionKeyForRoute('/reports/q3'),
          'reports.view');
    });

    test('non-restricted routes return null (never bounced)', () {
      expect(NavDestinations.permissionKeyForRoute('/home'), isNull);
      expect(NavDestinations.permissionKeyForRoute('/attendance'), isNull);
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
}
