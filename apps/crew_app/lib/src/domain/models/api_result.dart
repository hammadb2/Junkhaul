import 'package:freezed_annotation/freezed_annotation.dart';

part 'api_result.freezed.dart';

/// Generic envelope for any API call. Either [Success] with data of type [T]
/// or [Failure] with a message and a typed [ApiError].
@freezed
abstract class ApiResult<T> with _$ApiResult<T> {
  const factory ApiResult.success(T data) = Success<T>;
  const factory ApiResult.failure({
    required String message,
    @Default(ApiError.unknown) ApiError error,
    int? statusCode,
  }) = Failure<T>;
}

/// Coarse-grained error categorization used by the UI to decide what to show.
enum ApiError { network, auth, notFound, server, validation, unknown }
