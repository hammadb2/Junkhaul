import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

/// Coarse permission status for the permission gate.
enum PermissionStatus { granted, denied, permanentlyDenied, unknown }

/// Tracks the three permissions the app needs: location, camera, notifications.
/// Location is blocking (must be granted to reach /schedule).
/// Camera is required for photo capture steps.
/// Notifications are non-blocking (show a banner if denied).
class PermissionService {
  PermissionService();

  /// Check + request location permission. Returns the final status.
  /// Requests locationWhenInUse first, then locationAlways for background tracking.
  Future<PermissionStatus> checkAndRequestLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return PermissionStatus.denied;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    switch (permission) {
      case LocationPermission.always:
      case LocationPermission.whileInUse:
        return PermissionStatus.granted;
      case LocationPermission.deniedForever:
        return PermissionStatus.permanentlyDenied;
      case LocationPermission.denied:
      case LocationPermission.unableToDetermine:
        return PermissionStatus.denied;
    }
  }

  /// Check + request camera permission.
  Future<PermissionStatus> checkAndRequestCamera() async {
    final status = await Permission.camera.status;
    if (status.isGranted) return PermissionStatus.granted;
    if (status.isPermanentlyDenied) return PermissionStatus.permanentlyDenied;

    final result = await Permission.camera.request();
    if (result.isGranted) return PermissionStatus.granted;
    if (result.isPermanentlyDenied) return PermissionStatus.permanentlyDenied;
    return PermissionStatus.denied;
  }

  /// Check + request notification permission (non-blocking).
  Future<PermissionStatus> checkAndRequestNotifications() async {
    final status = await Permission.notification.status;
    if (status.isGranted) return PermissionStatus.granted;
    if (status.isPermanentlyDenied) return PermissionStatus.permanentlyDenied;

    final result = await Permission.notification.request();
    if (result.isGranted) return PermissionStatus.granted;
    if (result.isPermanentlyDenied) return PermissionStatus.permanentlyDenied;
    return PermissionStatus.denied;
  }

  /// Open the OS settings page so the user can grant a permanently-denied permission.
  Future<void> openSettings() async {
    await openAppSettings();
  }
}

final permissionServiceProvider = Provider<PermissionService>((ref) {
  return PermissionService();
});

/// Whether location permission has been granted. Watched by the router guard
/// to decide whether to redirect to /permissions-gate.
final locationPermissionProvider =
    NotifierProvider<LocationPermissionNotifier, PermissionStatus>(
  LocationPermissionNotifier.new,
);

class LocationPermissionNotifier extends Notifier<PermissionStatus> {
  @override
  PermissionStatus build() => PermissionStatus.unknown;

  void set(PermissionStatus status) {
    state = status;
  }
}
