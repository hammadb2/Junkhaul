import 'package:freezed_annotation/freezed_annotation.dart';

import 'booking.dart';

part 'schedule.freezed.dart';
part 'schedule.g.dart';

/// Crew assignment for a given day.
@freezed
abstract class CrewAssignment with _$CrewAssignment {
  const factory CrewAssignment({
    required String id,
    @JsonKey(name: 'assignment_date') String? assignmentDate,
    @JsonKey(name: 'uhaul_location') String? uhaulLocation,
    CrewMember? driver,
    CrewMember? secondary,
  }) = _CrewAssignment;

  factory CrewAssignment.fromJson(Map<String, dynamic> json) => _$CrewAssignmentFromJson(json);
}

/// Lightweight crew member reference (driver or secondary).
@freezed
abstract class CrewMember with _$CrewMember {
  const factory CrewMember({
    required String id,
    String? name,
    @JsonKey(name: 'first_name') String? firstName,
    @JsonKey(name: 'last_name') String? lastName,
    String? phone,
  }) = _CrewMember;

  factory CrewMember.fromJson(Map<String, dynamic> json) => _$CrewMemberFromJson(json);
}

/// Open job-clock session for the current employee.
@freezed
abstract class JobClockSession with _$JobClockSession {
  const factory JobClockSession({
    required String id,
    @JsonKey(name: 'booking_id') String? bookingId,
    @JsonKey(name: 'clock_in_at') String? clockInAt,
    @JsonKey(name: 'clock_out_at') String? clockOutAt,
    @JsonKey(name: 'duration_minutes') int? durationMinutes,
  }) = _JobClockSession;

  factory JobClockSession.fromJson(Map<String, dynamic> json) => _$JobClockSessionFromJson(json);
}

/// Open timesheet shift.
@freezed
abstract class OpenShift with _$OpenShift {
  const factory OpenShift({
    required String id,
    @JsonKey(name: 'clock_in_at') String? clockInAt,
  }) = _OpenShift;

  factory OpenShift.fromJson(Map<String, dynamic> json) => _$OpenShiftFromJson(json);
}

/// GET /api/employee/schedule (daily) response.
@freezed
abstract class DailyScheduleResponse with _$DailyScheduleResponse {
  const factory DailyScheduleResponse({
    CrewAssignment? assignment,
    CrewMember? partner,
    @Default(<Booking>[]) List<Booking> bookings,
    @JsonKey(name: 'open_sessions') @Default(<JobClockSession>[]) List<JobClockSession> openSessions,
    @JsonKey(name: 'completed_sessions') @Default(<JobClockSession>[]) List<JobClockSession> completedSessions,
    @JsonKey(name: 'open_shift') OpenShift? openShift,
  }) = _DailyScheduleResponse;

  factory DailyScheduleResponse.fromJson(Map<String, dynamic> json) => _$DailyScheduleResponseFromJson(json);
}

/// Single day in the weekly schedule view.
@freezed
abstract class WeekDay with _$WeekDay {
  const factory WeekDay({
    required String date,
    required String dayName,
    required int dayNum,
    @JsonKey(name: 'isToday') @Default(false) bool isToday,
    CrewAssignment? assignment,
    @Default(<Booking>[]) List<Booking> bookings,
  }) = _WeekDay;

  factory WeekDay.fromJson(Map<String, dynamic> json) => _$WeekDayFromJson(json);
}

/// GET /api/employee/schedule?weekly=true response.
@freezed
abstract class WeeklyScheduleResponse with _$WeeklyScheduleResponse {
  const factory WeeklyScheduleResponse({
    @Default(<WeekDay>[]) List<WeekDay> week,
    @JsonKey(name: 'startDate') String? startDate,
    @JsonKey(name: 'endDate') String? endDate,
  }) = _WeeklyScheduleResponse;

  factory WeeklyScheduleResponse.fromJson(Map<String, dynamic> json) => _$WeeklyScheduleResponseFromJson(json);
}
