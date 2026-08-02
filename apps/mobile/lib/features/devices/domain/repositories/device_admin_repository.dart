import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../entities/employee_device.dart';

/// Admin-side device binding administration (DeviceManagement.md §15).
///
/// Distinct from the employee's own binding flow (device_binding_screen): this
/// is the tenant admin managing everyone's handsets.
abstract class DeviceAdminRepository {
  /// Bound devices across the tenant. [search] is applied server-side.
  Future<Either<Failure, ({List<EmployeeDevice> rows, int total})>> listDevices({
    String? search,
    int skip,
    int take,
  });

  /// Change requests, optionally narrowed to one status.
  Future<Either<Failure, ({List<DeviceChangeRequest> rows, int total})>>
      listChangeRequests({
    DeviceChangeStatus? status,
    int skip,
    int take,
  });

  /// Approves a request: rebinds the employee to the new handset and cuts
  /// their existing sessions.
  Future<Either<Failure, DeviceChangeRequest>> approveChangeRequest(String id);

  Future<Either<Failure, DeviceChangeRequest>> rejectChangeRequest(
    String id,
    String rejectionReason,
  );

  /// Revokes a binding. The employee must re-bind (or request a change) before
  /// they can use the app again.
  Future<Either<Failure, EmployeeDevice>> revokeDevice(
    String id, {
    String? reason,
  });
}
