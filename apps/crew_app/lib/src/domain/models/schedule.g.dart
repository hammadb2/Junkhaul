// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'schedule.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CrewAssignment _$CrewAssignmentFromJson(Map<String, dynamic> json) =>
    _CrewAssignment(
      id: json['id'] as String,
      assignmentDate: json['assignment_date'] as String?,
      uhaulLocation: json['uhaul_location'] as String?,
      driver: json['driver'] == null
          ? null
          : CrewMember.fromJson(json['driver'] as Map<String, dynamic>),
      secondary: json['secondary'] == null
          ? null
          : CrewMember.fromJson(json['secondary'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$CrewAssignmentToJson(_CrewAssignment instance) =>
    <String, dynamic>{
      'id': instance.id,
      'assignment_date': instance.assignmentDate,
      'uhaul_location': instance.uhaulLocation,
      'driver': instance.driver,
      'secondary': instance.secondary,
    };

_CrewMember _$CrewMemberFromJson(Map<String, dynamic> json) => _CrewMember(
  id: json['id'] as String,
  name: json['name'] as String?,
  firstName: json['first_name'] as String?,
  lastName: json['last_name'] as String?,
  phone: json['phone'] as String?,
);

Map<String, dynamic> _$CrewMemberToJson(_CrewMember instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'first_name': instance.firstName,
      'last_name': instance.lastName,
      'phone': instance.phone,
    };

_JobClockSession _$JobClockSessionFromJson(Map<String, dynamic> json) =>
    _JobClockSession(
      id: json['id'] as String,
      bookingId: json['booking_id'] as String?,
      clockInAt: json['clock_in_at'] as String?,
      clockOutAt: json['clock_out_at'] as String?,
      durationMinutes: (json['duration_minutes'] as num?)?.toInt(),
    );

Map<String, dynamic> _$JobClockSessionToJson(_JobClockSession instance) =>
    <String, dynamic>{
      'id': instance.id,
      'booking_id': instance.bookingId,
      'clock_in_at': instance.clockInAt,
      'clock_out_at': instance.clockOutAt,
      'duration_minutes': instance.durationMinutes,
    };

_OpenShift _$OpenShiftFromJson(Map<String, dynamic> json) => _OpenShift(
  id: json['id'] as String,
  clockInAt: json['clock_in_at'] as String?,
);

Map<String, dynamic> _$OpenShiftToJson(_OpenShift instance) =>
    <String, dynamic>{'id': instance.id, 'clock_in_at': instance.clockInAt};

_DailyScheduleResponse _$DailyScheduleResponseFromJson(
  Map<String, dynamic> json,
) => _DailyScheduleResponse(
  assignment: json['assignment'] == null
      ? null
      : CrewAssignment.fromJson(json['assignment'] as Map<String, dynamic>),
  partner: json['partner'] == null
      ? null
      : CrewMember.fromJson(json['partner'] as Map<String, dynamic>),
  bookings:
      (json['bookings'] as List<dynamic>?)
          ?.map((e) => Booking.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <Booking>[],
  openSessions:
      (json['open_sessions'] as List<dynamic>?)
          ?.map((e) => JobClockSession.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <JobClockSession>[],
  completedSessions:
      (json['completed_sessions'] as List<dynamic>?)
          ?.map((e) => JobClockSession.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <JobClockSession>[],
  openShift: json['open_shift'] == null
      ? null
      : OpenShift.fromJson(json['open_shift'] as Map<String, dynamic>),
);

Map<String, dynamic> _$DailyScheduleResponseToJson(
  _DailyScheduleResponse instance,
) => <String, dynamic>{
  'assignment': instance.assignment,
  'partner': instance.partner,
  'bookings': instance.bookings,
  'open_sessions': instance.openSessions,
  'completed_sessions': instance.completedSessions,
  'open_shift': instance.openShift,
};

_WeekDay _$WeekDayFromJson(Map<String, dynamic> json) => _WeekDay(
  date: json['date'] as String,
  dayName: json['dayName'] as String,
  dayNum: (json['dayNum'] as num).toInt(),
  isToday: json['isToday'] as bool? ?? false,
  assignment: json['assignment'] == null
      ? null
      : CrewAssignment.fromJson(json['assignment'] as Map<String, dynamic>),
  bookings:
      (json['bookings'] as List<dynamic>?)
          ?.map((e) => Booking.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <Booking>[],
);

Map<String, dynamic> _$WeekDayToJson(_WeekDay instance) => <String, dynamic>{
  'date': instance.date,
  'dayName': instance.dayName,
  'dayNum': instance.dayNum,
  'isToday': instance.isToday,
  'assignment': instance.assignment,
  'bookings': instance.bookings,
};

_WeeklyScheduleResponse _$WeeklyScheduleResponseFromJson(
  Map<String, dynamic> json,
) => _WeeklyScheduleResponse(
  week:
      (json['week'] as List<dynamic>?)
          ?.map((e) => WeekDay.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <WeekDay>[],
  startDate: json['startDate'] as String?,
  endDate: json['endDate'] as String?,
);

Map<String, dynamic> _$WeeklyScheduleResponseToJson(
  _WeeklyScheduleResponse instance,
) => <String, dynamic>{
  'week': instance.week,
  'startDate': instance.startDate,
  'endDate': instance.endDate,
};
