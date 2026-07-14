// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'notification.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AppNotification _$AppNotificationFromJson(Map<String, dynamic> json) =>
    _AppNotification(
      id: json['id'] as String,
      title: json['title'] as String?,
      body: json['body'] as String?,
      type: json['type'] as String?,
      bookingId: json['booking_id'] as String?,
      isRead: json['is_read'] as bool? ?? false,
      createdAt: json['created_at'] as String?,
    );

Map<String, dynamic> _$AppNotificationToJson(_AppNotification instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'body': instance.body,
      'type': instance.type,
      'booking_id': instance.bookingId,
      'is_read': instance.isRead,
      'created_at': instance.createdAt,
    };

_NotificationsResponse _$NotificationsResponseFromJson(
  Map<String, dynamic> json,
) => _NotificationsResponse(
  notifications:
      (json['notifications'] as List<dynamic>?)
          ?.map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <AppNotification>[],
  unread: (json['unread'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$NotificationsResponseToJson(
  _NotificationsResponse instance,
) => <String, dynamic>{
  'notifications': instance.notifications,
  'unread': instance.unread,
};
