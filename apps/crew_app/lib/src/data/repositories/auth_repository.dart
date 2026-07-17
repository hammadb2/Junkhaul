import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../domain/models/employee.dart';
import '../../domain/providers/core_providers.dart';
import '../api/api_result.dart';
import '../api/dio_client.dart';

/// Auth state surfaced to the router guard.
enum AuthStatus {
  unknown,
  unauthenticated,
  needsOnboarding,
  needsVerification,
  authenticated,
}

class AuthState {
  const AuthState._({required this.status, this.employee});
  const AuthState.unknown() : status = AuthStatus.unknown, employee = null;
  const AuthState.unauthenticated()
    : status = AuthStatus.unauthenticated,
      employee = null;

  final AuthStatus status;
  final Employee? employee;

  AuthState copyWith({AuthStatus? status, Employee? employee}) => AuthState._(
    status: status ?? this.status,
    employee: employee ?? this.employee,
  );

  @override
  String toString() => 'AuthState(status=$status, employee=${employee?.email})';
}

/// Persists the jh_employee_session cookie and exposes the current auth state.
/// Uses Riverpod 3 [Notifier] so the router guard can watch [state] to redirect
/// on login, onboarding, and verification changes.
class AuthRepository extends Notifier<AuthState> {
  DioClient? _dio;
  FlutterSecureStorage? _storage;
  final _controller = StreamController<AuthState>.broadcast();

  Stream<AuthState> get stream => _controller.stream;

  @override
  AuthState build() {
    // Resolve the DioClient and secure storage, then bootstrap.
    final dioAsync = ref.watch(dioClientProvider);
    final storage = ref.watch(secureStorageProvider);
    dioAsync.whenData((dio) {
      _dio = dio;
      _storage = storage;
      _bootstrap();
    });
    return const AuthState.unknown();
  }

  DioClient get dio {
    final d = _dio;
    if (d == null) {
      throw const NetworkException('App is still initializing. Try again.');
    }
    return d;
  }

  Future<void> _bootstrap() async {
    try {
      final me = await fetchMe();
      _emit(me);
    } on AuthException {
      _emit(null);
    } catch (_) {
      state = const AuthState.unknown();
    }
  }

  /// POST /api/employee/login with {email, password}. On success the
  /// Set-Cookie header is persisted by the DioClient cookie jar and mirrored
  /// to secure storage so it survives app restarts.
  Future<void> login({required String email, required String password}) async {
    final d = dio;
    final body = await d.postJson(
      '/api/employee/login',
      body: {'email': email, 'password': password},
    );
    final res = LoginResponse.fromJson(body);
    await d.persistSessionCookie(_storage!);
    try {
      final me = await fetchMe();
      _emit(me);
    } catch (_) {
      _emit(res.employee);
    }
  }

  /// GET /api/employee/me — returns the full employee profile.
  Future<Employee> fetchMe() async {
    final body = await dio.getJson('/api/employee/me');
    return MeResponse.fromJson(body).employee;
  }

  /// POST /api/employee/logout — clears the session cookie and resets state.
  Future<void> logout() async {
    final d = _dio;
    final s = _storage;
    if (d != null && s != null) {
      try {
        await d.postJson('/api/employee/logout');
      } catch (_) {
        // Even if the server call fails, clear the local session.
      }
      await d.clearSession(s);
    }
    _emit(null);
  }

  void _emit(Employee? emp) {
    final next = emp == null
        ? const AuthState.unauthenticated()
        : AuthState._(
            status: emp.pendingVerification
                ? AuthStatus.needsVerification
                : !emp.onboardingComplete && !emp.onboarded
                ? AuthStatus.needsOnboarding
                : AuthStatus.authenticated,
            employee: emp,
          );
    state = next;
    _controller.add(next);
  }
}

/// Provider for [AuthRepository]. Watch this to get the current [AuthState].
final authRepositoryProvider = NotifierProvider<AuthRepository, AuthState>(
  AuthRepository.new,
);
