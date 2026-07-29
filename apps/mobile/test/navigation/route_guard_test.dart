import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/navigation/app_shell.dart';

/// Gate-chain unit tests (pure Dart — no widget tree, no router, no storage).
///
/// The chain is ordered and first-match-wins, so the bugs it produces are
/// ordering bugs: a gate that fires ahead of one that should have won, or a
/// gate that fires on its own screen and so redirects forever. Both shipped
/// before (bacc751, 3d0e8d6) and both are invisible to a "log in and look"
/// test, because reaching a given gate state on a real handset means resetting
/// server + device state first.
///
/// The chain under test (order matters):
///   1     Auth           !authed on a non-auth route      → /auth/login
///   1     Reverse-auth   authed on an auth route          → /home
///   1b    Password       mustChangePassword               → /auth/change-password
///   1c    Profile        !isOnboarded                     → /auth/profile-setup
///   1c-bis Device        isOnboarded && !deviceBound      → /auth/device-binding
///   1d    Permissions    …&& deviceBound && !permsSeen    → /permissions
///   5     RBAC           role lacks route permission      → /home
void main() {
  // A fully cleared account: every gate satisfied. Individual tests re-set only
  // the flag under test, so a new gate added upstream shows up as a failure
  // here rather than silently changing behaviour.
  GateState clear({
    String location = '/home',
    bool isAuthenticated = true,
    bool mustChangePassword = false,
    bool isOnboarded = true,
    bool deviceBound = true,
    bool permissionsFlowSeen = true,
    String? roleCode = 'EMPLOYEE_FIELD_STAFF',
  }) =>
      GateState(
        location: location,
        isAuthenticated: isAuthenticated,
        mustChangePassword: mustChangePassword,
        isOnboarded: isOnboarded,
        deviceBound: deviceBound,
        permissionsFlowSeen: permissionsFlowSeen,
        roleCode: roleCode,
      );

  group('gate 1 — authentication', () {
    test('unauthenticated user on a protected route goes to login', () {
      expect(
        RouteGuard.resolve(clear(isAuthenticated: false)),
        '/auth/login',
      );
    });

    test('unauthenticated user on the login screen is left alone', () {
      expect(
        RouteGuard.resolve(
            clear(location: '/auth/login', isAuthenticated: false)),
        isNull,
      );
    });

    test('unauthenticated user on splash is left alone', () {
      expect(
        RouteGuard.resolve(clear(location: '/splash', isAuthenticated: false)),
        isNull,
      );
    });

    test('authenticated user on an auth route is bounced home', () {
      expect(RouteGuard.resolve(clear(location: '/auth/login')), '/home');
    });

    // Auth is gate 1: it must win over every account-state gate behind it.
    // Otherwise a signed-out user with stale flags is sent to a gate screen
    // that cannot load, instead of to login.
    test('auth outranks every later gate when all conditions hold at once', () {
      expect(
        RouteGuard.resolve(clear(
          location: '/home',
          isAuthenticated: false,
          mustChangePassword: true,
          isOnboarded: false,
          deviceBound: false,
          permissionsFlowSeen: false,
        )),
        '/auth/login',
      );
    });
  });

  group('gate 1b — forced password change', () {
    test('fires when the account owes a password rotation', () {
      expect(
        RouteGuard.resolve(clear(mustChangePassword: true)),
        '/auth/change-password',
      );
    });

    // Regression: the change-password screen lives under /auth, so gate 1's
    // reverse-auth bounce used to send it to /home, and 1b sent it straight
    // back. Infinite redirect.
    test('does not fire on its own screen (no redirect loop)', () {
      expect(
        RouteGuard.resolve(clear(
          location: '/auth/change-password',
          mustChangePassword: true,
        )),
        isNull,
      );
    });

    // Regression: 1b stands down once the user is parked on its own screen, so
    // a downstream gate used to fire from there and pull them away — 1b then
    // fired again and sent them back. A brand-new account trips this, because
    // it is behind 1b and 1c at once:
    //   /auth/change-password => /auth/profile-setup => /auth/change-password
    test('holds the user on its screen while later gates are also open', () {
      expect(
        RouteGuard.resolve(clear(
          location: '/auth/change-password',
          mustChangePassword: true,
          isOnboarded: false,
          deviceBound: false,
          permissionsFlowSeen: false,
        )),
        isNull,
      );
    });

    // The other half of that loop: nothing should route to a later gate's
    // screen while the password is still unrotated.
    test('reclaims a user who reaches a later gate screen first', () {
      expect(
        RouteGuard.resolve(clear(
          location: '/auth/profile-setup',
          mustChangePassword: true,
          isOnboarded: false,
        )),
        '/auth/change-password',
      );
    });

    test('outranks profile setup, device binding and permissions', () {
      expect(
        RouteGuard.resolve(clear(
          mustChangePassword: true,
          isOnboarded: false,
          deviceBound: false,
          permissionsFlowSeen: false,
        )),
        '/auth/change-password',
      );
    });
  });

  group('gate 1c — profile setup', () {
    test('fires when the account has no profile yet', () {
      expect(
        RouteGuard.resolve(clear(isOnboarded: false)),
        '/auth/profile-setup',
      );
    });

    test('does not fire on its own screen (no redirect loop)', () {
      expect(
        RouteGuard.resolve(
            clear(location: '/auth/profile-setup', isOnboarded: false)),
        isNull,
      );
    });

    test('outranks device binding and permissions', () {
      expect(
        RouteGuard.resolve(clear(
          isOnboarded: false,
          deviceBound: false,
          permissionsFlowSeen: false,
        )),
        '/auth/profile-setup',
      );
    });
  });

  group('gate 1c-bis — device binding', () {
    test('fires for an onboarded employee with no bound handset', () {
      expect(
        RouteGuard.resolve(clear(deviceBound: false)),
        '/auth/device-binding',
      );
    });

    test('does not fire on its own screen (no redirect loop)', () {
      expect(
        RouteGuard.resolve(
            clear(location: '/auth/device-binding', deviceBound: false)),
        isNull,
      );
    });

    // An employee whose binding was revoked, or who is holding a replacement
    // handset, arrives unbound and must be able to ask for a new binding.
    test('exempts the device change-request screen', () {
      expect(
        RouteGuard.resolve(
            clear(location: '/device/change-request', deviceBound: false)),
        isNull,
      );
    });

    // Regression (3d0e8d6): binding must come before the permissions flow, so a
    // device is on file before any location capture starts.
    test('outranks the permissions flow', () {
      expect(
        RouteGuard.resolve(
            clear(deviceBound: false, permissionsFlowSeen: false)),
        '/auth/device-binding',
      );
    });

    // Gate 1c-bis is scoped to onboarded accounts: firing it first would strand
    // an employee on a binding screen that needs an employee record to exist.
    test('does not fire before profile setup', () {
      expect(
        RouteGuard.resolve(clear(isOnboarded: false, deviceBound: false)),
        '/auth/profile-setup',
      );
    });
  });

  group('gate 1d — permissions flow', () {
    test('fires once the account is fully set up and bound', () {
      expect(
        RouteGuard.resolve(clear(permissionsFlowSeen: false)),
        '/permissions',
      );
    });

    test('does not fire on its own screen (no redirect loop)', () {
      expect(
        RouteGuard.resolve(
            clear(location: '/permissions', permissionsFlowSeen: false)),
        isNull,
      );
    });

    // Regression (bacc751): pulling an unbound user to /permissions bounced
    // straight back through 1c-bis — /auth/device-binding ⇄ /permissions.
    test('does not fire while sitting on the device-binding screen', () {
      expect(
        RouteGuard.resolve(clear(
          location: '/auth/device-binding',
          deviceBound: false,
          permissionsFlowSeen: false,
        )),
        isNull,
      );
    });

    test('does not fire while sitting on the change-request screen', () {
      expect(
        RouteGuard.resolve(clear(
          location: '/device/change-request',
          deviceBound: false,
          permissionsFlowSeen: false,
        )),
        isNull,
      );
    });
  });

  group('gate 5 — RBAC', () {
    // A field employee carries no reports.view, so a deep link (push
    // notification, stale context.go) into /reports must bounce.
    test('bounces a role that lacks the route permission', () {
      expect(
        RouteGuard.resolve(
            clear(location: '/reports', roleCode: 'EMPLOYEE_FIELD_STAFF')),
        '/home',
      );
    });

    test('allows a role that carries the route permission', () {
      expect(
        RouteGuard.resolve(
            clear(location: '/reports', roleCode: 'ADMIN_MANAGER')),
        isNull,
      );
    });

    // Gate 5 redirects to /home, so /home itself must never fail gate 5 for any
    // role — that would be an unbreakable loop.
    test('/home is reachable by every role', () {
      for (final role in const [
        'EMPLOYEE_FIELD_STAFF',
        'ADMIN_MANAGER',
        'CUSTOMER',
        'FIELD_TECHNICIAN',
        'SALES_EXECUTIVE',
        'BRANCH_MANAGER',
        'SOME_UNKNOWN_CUSTOM_ROLE',
      ]) {
        expect(
          RouteGuard.resolve(clear(location: '/home', roleCode: role)),
          isNull,
          reason: '$role must be able to reach /home',
        );
      }
    });

    // RBAC is last: an account still owing a setup step must land on that step,
    // not be bounced home by a permission check on the route it deep-linked to.
    test('every account-state gate outranks RBAC', () {
      expect(
        RouteGuard.resolve(clear(
          location: '/reports',
          mustChangePassword: true,
          roleCode: 'EMPLOYEE_FIELD_STAFF',
        )),
        '/auth/change-password',
      );
      expect(
        RouteGuard.resolve(clear(
          location: '/reports',
          isOnboarded: false,
          roleCode: 'EMPLOYEE_FIELD_STAFF',
        )),
        '/auth/profile-setup',
      );
      expect(
        RouteGuard.resolve(clear(
          location: '/reports',
          deviceBound: false,
          roleCode: 'EMPLOYEE_FIELD_STAFF',
        )),
        '/auth/device-binding',
      );
      expect(
        RouteGuard.resolve(clear(
          location: '/reports',
          permissionsFlowSeen: false,
          roleCode: 'EMPLOYEE_FIELD_STAFF',
        )),
        '/permissions',
      );
    });
  });

  group('fully cleared account', () {
    test('reaches home with no redirect', () {
      expect(RouteGuard.resolve(clear()), isNull);
    });

    // Non-employee logins (tenant admins, back-office) never bind a handset;
    // the API reports them bound so the gate cannot trap them.
    test('an admin with no employee record is never trapped by binding', () {
      expect(
        RouteGuard.resolve(clear(location: '/home', roleCode: 'ADMIN_MANAGER')),
        isNull,
      );
    });
  });

  // The whole point of the chain: a brand-new employee walks every gate in
  // order, each screen clearing its own flag, and lands on /home. Each step
  // asserts where the router sends them next given the flags still outstanding.
  group('end-to-end walk (one account, all gates)', () {
    test('fresh employee traverses the chain in order', () {
      var mustChangePassword = true;
      var isOnboarded = false;
      var deviceBound = false;
      var permissionsFlowSeen = false;

      GateState at(String location) => GateState(
            location: location,
            isAuthenticated: true,
            mustChangePassword: mustChangePassword,
            isOnboarded: isOnboarded,
            deviceBound: deviceBound,
            permissionsFlowSeen: permissionsFlowSeen,
            roleCode: 'EMPLOYEE_FIELD_STAFF',
          );

      // Lands on /home after login → gate 1b takes over.
      expect(RouteGuard.resolve(at('/home')), '/auth/change-password');

      // On the change-password screen, 1b stands down but 1c is still
      // outstanding — the account owes a profile too. The guard already points
      // at the next gate; what matters is that it does NOT point back here.
      expect(RouteGuard.resolve(at('/auth/change-password')),
          isNot('/auth/change-password'));
      mustChangePassword = false; // force_change_password_screen.dart

      expect(RouteGuard.resolve(at('/auth/change-password')),
          '/auth/profile-setup');

      // Same shape one gate down: 1c stands down on its own screen, 1c-bis is
      // still outstanding.
      expect(RouteGuard.resolve(at('/auth/profile-setup')),
          isNot('/auth/profile-setup'));
      isOnboarded = true; // profile_setup_screen.dart

      expect(RouteGuard.resolve(at('/auth/profile-setup')),
          '/auth/device-binding');

      // 1c-bis stands down on its own screen, and 1d is suppressed there too
      // (bacc751) — so this one really is null.
      expect(RouteGuard.resolve(at('/auth/device-binding')), isNull);
      deviceBound = true; // device_binding_screen.dart

      expect(RouteGuard.resolve(at('/auth/device-binding')), '/permissions');
      expect(RouteGuard.resolve(at('/permissions')), isNull);
      permissionsFlowSeen = true; // permissions_flow_screen.dart

      // Last gate cleared: the chain is now inert. It does NOT push to /home —
      // permissions_flow_screen.dart navigates there itself. The guard's job
      // here is only to stop blocking.
      expect(RouteGuard.resolve(at('/permissions')), isNull);
      expect(RouteGuard.resolve(at('/home')), isNull);
    });
  });
}
