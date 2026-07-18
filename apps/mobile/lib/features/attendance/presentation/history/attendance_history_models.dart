enum AttendanceEntryStatus { present, working, absent, leave }

class AttendanceHistoryEntry {
  const AttendanceHistoryEntry({
    required this.id,
    required this.status,
    this.checkIn,
    this.checkOut,
    this.isLate = false,
  });

  final String id;
  final AttendanceEntryStatus status;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final bool isLate;

  Duration? get worked {
    if (checkIn == null || checkOut == null) return null;
    return checkOut!.difference(checkIn!);
  }
}

class AttendanceHistoryPage {
  const AttendanceHistoryPage({
    required this.entries,
    required this.total,
    required this.page,
    required this.limit,
  });

  final List<AttendanceHistoryEntry> entries;
  final int total;
  final int page;
  final int limit;
}
