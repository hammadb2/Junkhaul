/// Typed exceptions used across the data layer. Each maps to an [ApiError]
/// category so the UI can render consistent error states.
library;

import '../../domain/models/api_result.dart';

class NetworkException implements Exception {
  const NetworkException(this.message, {this.cause});
  final String message;
  final Object? cause;

  ApiError get error => ApiError.network;

  @override
  String toString() => 'NetworkException: $message';
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;

  ApiError get error => ApiError.auth;

  @override
  String toString() => 'AuthException: $message';
}

class ApiException implements Exception {
  const ApiException(this.message, {required this.statusCode, this.body})
    : assert(statusCode >= 400 && statusCode < 500);
  final String message;
  final int statusCode;
  final Map<String, dynamic>? body;

  ApiError get error => statusCode == 401 || statusCode == 403
      ? ApiError.auth
      : statusCode == 404
      ? ApiError.notFound
      : statusCode == 422
      ? ApiError.validation
      : ApiError.unknown;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ServerException implements Exception {
  const ServerException(this.message, {this.statusCode, this.cause});
  final String message;
  final int? statusCode;
  final Object? cause;

  ApiError get error => ApiError.server;

  @override
  String toString() => 'ServerException($statusCode): $message';
}
