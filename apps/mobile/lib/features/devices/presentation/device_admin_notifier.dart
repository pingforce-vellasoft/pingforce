import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../domain/entities/employee_device.dart';
import '../domain/repositories/device_admin_repository.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DEVICE ADMIN STATE
// ─────────────────────────────────────────────────────────────────────────────

class DeviceAdminState {
  const DeviceAdminState({
    this.isLoadingDevices = true,
    this.isLoadingRequests = true,
    this.isBusy = false,
    this.deviceError,
    this.requestError,
    this.devices = const [],
    this.requests = const [],
    this.search = '',
    this.statusFilter = DeviceChangeStatus.pending,
  });

  final bool isLoadingDevices;
  final bool isLoadingRequests;

  /// True while an approve / reject / revoke is in flight, so the UI can block
  /// a second tap on a decision that rebinds a handset.
  final bool isBusy;

  final String? deviceError;
  final String? requestError;
  final List<EmployeeDevice> devices;
  final List<DeviceChangeRequest> requests;
  final String search;
  final DeviceChangeStatus statusFilter;

  /// Pending requests drive the tab badge — that is the queue needing action.
  int get pendingCount => requests.where((r) => r.isPending).length;

  DeviceAdminState copyWith({
    bool? isLoadingDevices,
    bool? isLoadingRequests,
    bool? isBusy,
    String? deviceError,
    String? requestError,
    bool clearDeviceError = false,
    bool clearRequestError = false,
    List<EmployeeDevice>? devices,
    List<DeviceChangeRequest>? requests,
    String? search,
    DeviceChangeStatus? statusFilter,
  }) {
    return DeviceAdminState(
      isLoadingDevices: isLoadingDevices ?? this.isLoadingDevices,
      isLoadingRequests: isLoadingRequests ?? this.isLoadingRequests,
      isBusy: isBusy ?? this.isBusy,
      deviceError: clearDeviceError ? null : (deviceError ?? this.deviceError),
      requestError:
          clearRequestError ? null : (requestError ?? this.requestError),
      devices: devices ?? this.devices,
      requests: requests ?? this.requests,
      search: search ?? this.search,
      statusFilter: statusFilter ?? this.statusFilter,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVICE ADMIN NOTIFIER
// ─────────────────────────────────────────────────────────────────────────────

final deviceAdminNotifierProvider =
    NotifierProvider<DeviceAdminNotifier, DeviceAdminState>(
  DeviceAdminNotifier.new,
);

class DeviceAdminNotifier extends Notifier<DeviceAdminState> {
  DeviceAdminRepository get _repo => sl<DeviceAdminRepository>();

  static const _pageSize = 50;

  @override
  DeviceAdminState build() => const DeviceAdminState();

  Future<void> loadAll() async {
    await Future.wait([loadDevices(), loadRequests()]);
  }

  Future<void> loadDevices() async {
    state = state.copyWith(isLoadingDevices: true, clearDeviceError: true);
    final result = await _repo.listDevices(
      search: state.search,
      take: _pageSize,
    );
    result.fold(
      (f) => state =
          state.copyWith(isLoadingDevices: false, deviceError: f.message),
      (page) => state = state.copyWith(
        isLoadingDevices: false,
        devices: page.rows,
        clearDeviceError: true,
      ),
    );
  }

  Future<void> loadRequests() async {
    state = state.copyWith(isLoadingRequests: true, clearRequestError: true);
    final result = await _repo.listChangeRequests(
      status: state.statusFilter,
      take: _pageSize,
    );
    result.fold(
      (f) => state =
          state.copyWith(isLoadingRequests: false, requestError: f.message),
      (page) => state = state.copyWith(
        isLoadingRequests: false,
        requests: page.rows,
        clearRequestError: true,
      ),
    );
  }

  /// Search is applied server-side, so changing it refetches.
  Future<void> setSearch(String value) async {
    state = state.copyWith(search: value);
    await loadDevices();
  }

  Future<void> setStatusFilter(DeviceChangeStatus status) async {
    state = state.copyWith(statusFilter: status);
    await loadRequests();
  }

  /// Approves a change request. Returns null on success or an error message.
  /// Both lists are refetched: approving rebinds the employee, so the devices
  /// list is stale too.
  Future<String?> approve(String id) async {
    state = state.copyWith(isBusy: true, clearRequestError: true);
    final result = await _repo.approveChangeRequest(id);
    return result.fold(
      (f) {
        state = state.copyWith(isBusy: false, requestError: f.message);
        return f.message;
      },
      (_) async {
        state = state.copyWith(isBusy: false);
        await loadAll();
        return null;
      },
    );
  }

  Future<String?> reject(String id, String rejectionReason) async {
    state = state.copyWith(isBusy: true, clearRequestError: true);
    final result = await _repo.rejectChangeRequest(id, rejectionReason);
    return result.fold(
      (f) {
        state = state.copyWith(isBusy: false, requestError: f.message);
        return f.message;
      },
      (_) async {
        state = state.copyWith(isBusy: false);
        await loadRequests();
        return null;
      },
    );
  }

  Future<String?> revoke(String id, {String? reason}) async {
    state = state.copyWith(isBusy: true, clearDeviceError: true);
    final result = await _repo.revokeDevice(id, reason: reason);
    return result.fold(
      (f) {
        state = state.copyWith(isBusy: false, deviceError: f.message);
        return f.message;
      },
      (_) async {
        state = state.copyWith(isBusy: false);
        await loadDevices();
        return null;
      },
    );
  }
}
