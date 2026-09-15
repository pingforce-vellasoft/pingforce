import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../injection_container.dart';
import '../../data/datasources/attendance_history_remote_data_source.dart';
import '../history/attendance_history_models.dart';

const _correctionTypes = <String, String>{
  'MISSING_CHECK_IN': 'Missing check-in',
  'MISSING_CHECK_OUT': 'Missing check-out',
  'WRONG_CHECK_IN_TIME': 'Wrong check-in time',
  'WRONG_CHECK_OUT_TIME': 'Wrong check-out time',
  'WRONG_ATTENDANCE_STATUS': 'Wrong attendance status',
  'GPS_EXCEPTION': 'GPS issue',
  'GEOFENCE_EXCEPTION': 'Geofence issue',
  'DEVICE_FAILURE': 'Device issue',
  'BIOMETRIC_FAILURE': 'Biometric issue',
  'OFFLINE_SYNC_ISSUE': 'Offline sync issue',
  'MANUAL_ATTENDANCE_REQUEST': 'Manual attendance request',
};

const _timeTypes = {
  'MISSING_CHECK_IN',
  'MISSING_CHECK_OUT',
  'WRONG_CHECK_IN_TIME',
  'WRONG_CHECK_OUT_TIME',
};

class CorrectionRequestScreen extends StatefulWidget {
  const CorrectionRequestScreen({super.key});

  @override
  State<CorrectionRequestScreen> createState() =>
      _CorrectionRequestScreenState();
}

class _CorrectionRequestScreenState extends State<CorrectionRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  List<AttendanceHistoryEntry> _entries = const [];
  AttendanceHistoryEntry? _selectedEntry;
  String _type = 'MISSING_CHECK_IN';
  String _status = 'PRESENT';
  DateTime _requestedTime = DateTime.now();
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final page = await sl<AttendanceHistoryRemoteDataSource>().fetchLogs(
        limit: 60,
      );
      if (!mounted) return;
      setState(() {
        _entries = page.entries;
        _selectedEntry = page.entries.isEmpty ? null : page.entries.first;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Could not load your attendance records.';
      });
    }
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _requestedTime,
      firstDate: DateTime.now().subtract(const Duration(days: 90)),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_requestedTime),
    );
    if (time == null) return;
    setState(() {
      _requestedTime = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
    });
  }

  String get _requestedValue {
    if (_timeTypes.contains(_type)) {
      return _requestedTime.toUtc().toIso8601String();
    }
    if (_type == 'WRONG_ATTENDANCE_STATUS') return _status;
    return 'REVIEW_REQUESTED';
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _selectedEntry == null) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await sl<AttendanceHistoryRemoteDataSource>().requestCorrection(
        attendanceId: _selectedEntry!.attendanceId,
        correctionType: _type,
        requestedValue: _requestedValue,
        reason: _reasonController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Correction request submitted.')),
      );
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = _message(error);
      });
    }
  }

  String _message(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map<String, dynamic>) {
        final message = data['message'];
        if (message is String && message.isNotEmpty) return message;
      }
    }
    return 'Could not submit the correction request. Try again.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Request correction')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _entries.isEmpty
          ? const Center(child: Text('No attendance record is available.'))
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  DropdownButtonFormField<AttendanceHistoryEntry>(
                    initialValue: _selectedEntry,
                    decoration: const InputDecoration(
                      labelText: 'Attendance day',
                      border: OutlineInputBorder(),
                    ),
                    items: _entries
                        .map(
                          (entry) => DropdownMenuItem(
                            value: entry,
                            child: Text(
                              MaterialLocalizations.of(
                                context,
                              ).formatMediumDate(entry.date),
                            ),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) =>
                        setState(() => _selectedEntry = value),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: _type,
                    decoration: const InputDecoration(
                      labelText: 'What needs correction?',
                      border: OutlineInputBorder(),
                    ),
                    items: _correctionTypes.entries
                        .map(
                          (entry) => DropdownMenuItem(
                            value: entry.key,
                            child: Text(entry.value),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) =>
                        setState(() => _type = value ?? _type),
                  ),
                  const SizedBox(height: 16),
                  if (_timeTypes.contains(_type))
                    ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                      ),
                      shape: RoundedRectangleBorder(
                        side: BorderSide(
                          color: Theme.of(context).colorScheme.outline,
                        ),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      title: const Text('Correct date and time'),
                      subtitle: Text(_requestedTime.toString()),
                      trailing: const Icon(Icons.edit_calendar_outlined),
                      onTap: _pickDateTime,
                    ),
                  if (_type == 'WRONG_ATTENDANCE_STATUS')
                    DropdownButtonFormField<String>(
                      initialValue: _status,
                      decoration: const InputDecoration(
                        labelText: 'Correct status',
                        border: OutlineInputBorder(),
                      ),
                      items: const ['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE']
                          .map(
                            (status) => DropdownMenuItem(
                              value: status,
                              child: Text(status.replaceAll('_', ' ')),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: (value) =>
                          setState(() => _status = value ?? _status),
                    ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _reasonController,
                    minLines: 3,
                    maxLines: 6,
                    maxLength: 1000,
                    decoration: const InputDecoration(
                      labelText: 'Reason',
                      hintText: 'Explain what happened and what should change.',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) => (value?.trim().length ?? 0) < 5
                        ? 'Please provide a short explanation.'
                        : null,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: _submitting ? null : _submit,
                    icon: _submitting
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send_outlined),
                    label: const Text('Submit request'),
                  ),
                ],
              ),
            ),
    );
  }
}
