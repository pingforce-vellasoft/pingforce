import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../domain/entities/customer.dart';
import '../domain/repositories/customer_repository.dart';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER LIST STATE
// ─────────────────────────────────────────────────────────────────────────────

class CustomerState {
  const CustomerState({
    this.isLoading = true,
    this.isLoadingMore = false,
    this.isSaving = false,
    this.errorMessage,
    this.items = const [],
    this.search = '',
    this.hasMore = true,
  });

  final bool isLoading;
  final bool isLoadingMore;
  final bool isSaving;
  final String? errorMessage;
  final List<Customer> items;
  final String search;

  /// False once a page came back short, so the list stops asking for more.
  final bool hasMore;

  /// Client-side filter over what has been loaded — the list endpoint takes
  /// skip/take but no search parameter.
  List<Customer> get visibleItems {
    final q = search.trim().toLowerCase();
    if (q.isEmpty) return items;
    return items.where((c) {
      return c.name.toLowerCase().contains(q) ||
          c.customerCode.toLowerCase().contains(q) ||
          c.legalName.toLowerCase().contains(q) ||
          (c.primaryEmail ?? '').toLowerCase().contains(q) ||
          (c.primaryMobile ?? '').toLowerCase().contains(q);
    }).toList();
  }

  CustomerState copyWith({
    bool? isLoading,
    bool? isLoadingMore,
    bool? isSaving,
    String? errorMessage,
    bool clearError = false,
    List<Customer>? items,
    String? search,
    bool? hasMore,
  }) {
    return CustomerState(
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      items: items ?? this.items,
      search: search ?? this.search,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER NOTIFIER
// ─────────────────────────────────────────────────────────────────────────────

final customerNotifierProvider =
    NotifierProvider<CustomerNotifier, CustomerState>(CustomerNotifier.new);

class CustomerNotifier extends Notifier<CustomerState> {
  CustomerRepository get _repo => sl<CustomerRepository>();

  static const _pageSize = 50;

  @override
  CustomerState build() => const CustomerState();

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final result = await _repo.getCustomers(skip: 0, take: _pageSize);
    result.fold(
      (f) => state = state.copyWith(isLoading: false, errorMessage: f.message),
      (items) => state = state.copyWith(
        isLoading: false,
        items: items,
        clearError: true,
        hasMore: items.length >= _pageSize,
      ),
    );
  }

  Future<void> refresh() => load();

  /// Loads the next page by offset. No-ops while a load is in flight or once
  /// the last page came back short.
  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;

    state = state.copyWith(isLoadingMore: true);
    final result = await _repo.getCustomers(
      skip: state.items.length,
      take: _pageSize,
    );
    result.fold(
      (f) =>
          state = state.copyWith(isLoadingMore: false, errorMessage: f.message),
      (page) => state = state.copyWith(
        isLoadingMore: false,
        items: [...state.items, ...page],
        hasMore: page.length >= _pageSize,
        clearError: true,
      ),
    );
  }

  void setSearch(String value) => state = state.copyWith(search: value);

  /// Creates a customer and prepends it. Returns null on success or an error
  /// message the caller can surface.
  Future<String?> create({
    required String customerCode,
    required String legalName,
    String? displayName,
    String? customerType,
    String? primaryEmail,
    String? primaryMobile,
    String? industry,
    String? status,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true);
    final result = await _repo.createCustomer(
      customerCode: customerCode,
      legalName: legalName,
      displayName: displayName,
      customerType: customerType,
      primaryEmail: primaryEmail,
      primaryMobile: primaryMobile,
      industry: industry,
      status: status,
    );
    return result.fold(
      (f) {
        state = state.copyWith(isSaving: false, errorMessage: f.message);
        return f.message;
      },
      (created) {
        state = state.copyWith(
          isSaving: false,
          items: [created, ...state.items],
          clearError: true,
        );
        return null;
      },
    );
  }

  /// Updates a customer in place. Returns null on success or an error message.
  Future<String?> update(
    String id, {
    String? customerCode,
    String? legalName,
    String? displayName,
    String? customerType,
    String? primaryEmail,
    String? primaryMobile,
    String? industry,
    String? status,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true);
    final result = await _repo.updateCustomer(
      id,
      customerCode: customerCode,
      legalName: legalName,
      displayName: displayName,
      customerType: customerType,
      primaryEmail: primaryEmail,
      primaryMobile: primaryMobile,
      industry: industry,
      status: status,
    );
    return result.fold(
      (f) {
        state = state.copyWith(isSaving: false, errorMessage: f.message);
        return f.message;
      },
      (updated) {
        state = state.copyWith(
          isSaving: false,
          items: [
            for (final c in state.items) if (c.id == id) updated else c,
          ],
          clearError: true,
        );
        return null;
      },
    );
  }

  /// Optimistically removes the customer, persists, reverts on failure.
  Future<String?> delete(String id) async {
    final previous = state.items;
    state = state.copyWith(items: state.items.where((c) => c.id != id).toList());
    final result = await _repo.deleteCustomer(id);
    return result.fold(
      (f) {
        state = state.copyWith(items: previous, errorMessage: f.message);
        return f.message;
      },
      (_) => null,
    );
  }
}
