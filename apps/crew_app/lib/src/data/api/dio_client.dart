import 'dart:convert';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

import 'api_result.dart';

/// HTTP client for the Junkhaul Crew App.
///
/// - Persists the `jh_employee_session` cookie set by /api/employee/login and
///   /api/employee/signup so subsequent requests are authenticated.
/// - Retries network/timeout errors up to 3 times with exponential backoff.
/// - 401 responses are surfaced as [AuthException] so the router can redirect
///   to /login.
class DioClient {
  DioClient._(this._dio, this._cookieJar);

  final Dio _dio;
  final PersistCookieJar _cookieJar;

  /// Build a configured client. [baseUrl] is the Next.js deployment origin
  /// (e.g. https://www.junkhaul.ca). The secure storage is used to persist
  /// the session cookie across app restarts.
  static Future<DioClient> create({
    required String baseUrl,
    FlutterSecureStorage? secureStorage,
    Duration connectTimeout = const Duration(seconds: 15),
    Duration receiveTimeout = const Duration(seconds: 15),
  }) async {
    final appDir = await getApplicationDocumentsDirectory();
    final cookieJar = PersistCookieJar(
      ignoreExpires: false,
      storage: FileStorage('${appDir.path}/.cookies/'),
    );

    final dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: connectTimeout,
        receiveTimeout: receiveTimeout,
        sendTimeout: connectTimeout,
        headers: const {'Accept': 'application/json'},
        validateStatus: (status) => status != null && status >= 200 && status < 400,
      ),
    );

    dio.interceptors.add(CookieManager(cookieJar));
    dio.interceptors.add(_RetryInterceptor());
    dio.interceptors.add(_AuthInterceptor());

    // Restore a previously persisted session cookie, if any.
    final storage = secureStorage ?? const FlutterSecureStorage();
    final savedCookie = await storage.read(key: _kSessionCookieKey);
    if (savedCookie != null && savedCookie.isNotEmpty) {
      final uri = Uri.parse(baseUrl);
      await cookieJar.saveFromResponse(
        uri,
        [Cookie(_kSessionCookieName, savedCookie)
          ..domain = uri.host
          ..path = '/'
          ..httpOnly = true],
      );
    }

    return DioClient._(dio, cookieJar);
  }

  Dio get raw => _dio;
  PersistCookieJar get cookieJar => _cookieJar;

  /// Convenience GET that decodes JSON and converts errors to typed exceptions.
  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final r = await _dio.get<dynamic>(path, queryParameters: query);
      return r.data is String ? _decodeString(r.data as String) : (r.data as Map).cast<String, dynamic>();
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  /// Convenience POST that encodes JSON and decodes JSON.
  Future<Map<String, dynamic>> postJson(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
  }) async {
    try {
      final r = await _dio.post<dynamic>(path, data: body, queryParameters: query);
      return r.data is String ? _decodeString(r.data as String) : (r.data as Map).cast<String, dynamic>();
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  /// Convenience PUT that encodes JSON and decodes JSON.
  Future<Map<String, dynamic>> putJson(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
  }) async {
    try {
      final r = await _dio.put<dynamic>(path, data: body, queryParameters: query);
      return r.data is String ? _decodeString(r.data as String) : (r.data as Map).cast<String, dynamic>();
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  /// Convenience multipart upload (used for documents, selfies, photos).
  Future<Map<String, dynamic>> postMultipart(
    String path, {
    required FormData formData,
  }) async {
    try {
      final r = await _dio.post<dynamic>(path, data: formData);
      return r.data is String ? _decodeString(r.data as String) : (r.data as Map).cast<String, dynamic>();
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  /// Persist the current session cookie (if any) to secure storage so it
  /// survives app restarts. Called by [AuthRepository] after login.
  Future<void> persistSessionCookie(FlutterSecureStorage storage) async {
    final uri = Uri.parse(_dio.options.baseUrl);
    final cookies = await _cookieJar.loadForRequest(uri);
    final session = cookies.firstWhere(
      (c) => c.name == _kSessionCookieName,
      orElse: () => Cookie(_kSessionCookieName, ''),
    );
    if (session.value.isNotEmpty) {
      await storage.write(key: _kSessionCookieKey, value: session.value);
    } else {
      await storage.delete(key: _kSessionCookieKey);
    }
  }

  /// Clear all cookies and the persisted session. Called on logout.
  Future<void> clearSession(FlutterSecureStorage storage) async {
    await _cookieJar.deleteAll();
    await storage.delete(key: _kSessionCookieKey);
  }

  Map<String, dynamic> _decodeString(String s) {
    if (s.isEmpty) return const {};
    return jsonDecode(s) as Map<String, dynamic>;
  }
}

const String _kSessionCookieName = 'jh_employee_session';
const String _kSessionCookieKey = 'jh_employee_session_cookie';

Exception _mapDioException(DioException e) {
  final status = e.response?.statusCode;
  if (status != null) {
    if (status == 401 || status == 403) {
      return AuthException(_extractErrorMessage(e.response) ?? 'Unauthorized');
    }
    if (status >= 400 && status < 500) {
      return ApiException(
        _extractErrorMessage(e.response) ?? 'Request failed',
        statusCode: status,
        body: e.response?.data is Map ? (e.response!.data as Map).cast<String, dynamic>() : null,
      );
    }
    if (status >= 500) {
      return ServerException(
        _extractErrorMessage(e.response) ?? 'Server error',
        statusCode: status,
        cause: e,
      );
    }
  }
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.connectionError:
      return NetworkException('Network error: ${e.message}', cause: e);
    case DioExceptionType.badCertificate:
      return ServerException('TLS certificate error', cause: e);
    case DioExceptionType.cancel:
      return NetworkException('Request cancelled', cause: e);
    case DioExceptionType.badResponse:
    case DioExceptionType.unknown:
    case DioExceptionType.transformTimeout:
      return ServerException('Unexpected error: ${e.message}', cause: e);
  }
}

String? _extractErrorMessage(Response<dynamic>? r) {
  if (r?.data is Map) {
    final data = r!.data as Map;
    final err = data['error'];
    if (err is String && err.isNotEmpty) return err;
  }
  return null;
}

/// Retries idempotent network/timeout errors up to 3 times with exponential
/// backoff (1s, 2s, 4s). 4xx responses are never retried.
class _RetryInterceptor extends Interceptor {
  static const _maxAttempts = 3;

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final attempt = (err.requestOptions.extra['retry_attempt'] as int?) ?? 0;
    final retriable = err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError;

    if (!retriable || attempt >= _maxAttempts) {
      return handler.next(err);
    }

    final backoff = Duration(seconds: 1 << attempt);
    await Future<void>.delayed(backoff);

    try {
      final opts = err.requestOptions.copyWith(extra: {...err.requestOptions.extra, 'retry_attempt': attempt + 1});
      final dio = Dio();
      // Reuse the same base options as the parent Dio.
      dio.options
        ..baseUrl = err.requestOptions.baseUrl
        ..connectTimeout = err.requestOptions.connectTimeout
        ..receiveTimeout = err.requestOptions.receiveTimeout
        ..headers.addAll(err.requestOptions.headers);
      final r = await dio.fetch<dynamic>(opts);
      return handler.resolve(r);
    } on DioException catch (e) {
      return handler.next(e);
    } catch (e) {
      return handler.next(err);
    }
  }
}

/// Surfaces 401 responses as [AuthException] so the router can redirect to
/// /login. Other 4xx/5xx are left for the caller to map via [_mapDioException].
class _AuthInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final status = err.response?.statusCode;
    if (status == 401 || status == 403) {
      return handler.next(
        DioException(
          requestOptions: err.requestOptions,
          response: err.response,
          type: err.type,
          error: AuthException(_extractErrorMessage(err.response) ?? 'Unauthorized'),
        ),
      );
    }
    handler.next(err);
  }
}


