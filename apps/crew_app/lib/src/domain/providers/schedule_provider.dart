import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/api/employee_api.dart';
import '../models/schedule.dart';

/// Fetches the daily schedule (assignment + bookings) for the given date.
/// Pass null for today.
final dailyScheduleProvider =
    FutureProvider.family<DailyScheduleResponse, String?>((ref, date) async {
      final api = await ref.watch(employeeApiProvider.future);
      return api.fetchDailySchedule(date: date);
    });

/// Fetches the weekly schedule view.
final weeklyScheduleProvider =
    FutureProvider.family<WeeklyScheduleResponse, String?>((ref, date) async {
      final api = await ref.watch(employeeApiProvider.future);
      return api.fetchWeeklySchedule(date: date);
    });

/// Convenience: today's schedule.
final todayScheduleProvider = FutureProvider<DailyScheduleResponse>((
  ref,
) async {
  final api = await ref.watch(employeeApiProvider.future);
  return api.fetchDailySchedule();
});
