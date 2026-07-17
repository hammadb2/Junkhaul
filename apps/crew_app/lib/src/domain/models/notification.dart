import 'package:freezed_annotation/freezed_annotation.dart';

part 'notification.freezed.dart';
part 'notification.g.dart';

/// Notification row from GET /api/employee/notifications.
@freezed
abstract class AppNotification with _$AppNotification {
  const factory AppNotification({
    required String id,
    String? title,
    String? body,
    String? type,
    @JsonKey(name: 'booking_id') String? bookingId,
    @JsonKey(name: 'is_read') @Default(false) bool isRead,
    @JsonKey(name: 'created_at') String? createdAt,
  }) = _AppNotification;

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      _$AppNotificationFromJson(json);
}

/// GET /api/employee/notifications response.
@freezed
abstract class NotificationsResponse with _$NotificationsResponse {
  const factory NotificationsResponse({
    @Default(<AppNotification>[]) List<AppNotification> notifications,
    @Default(0) int unread,
  }) = _NotificationsResponse;

  factory NotificationsResponse.fromJson(Map<String, dynamic> json) =>
      _$NotificationsResponseFromJson(json);
}
