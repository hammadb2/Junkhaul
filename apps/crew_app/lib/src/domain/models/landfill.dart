import 'package:freezed_annotation/freezed_annotation.dart';

part 'landfill.freezed.dart';
part 'landfill.g.dart';

/// Landfill row returned by GET /api/employee/landfill.
@freezed
abstract class Landfill with _$Landfill {
  const factory Landfill({
    required String id,
    String? name,
    String? address,
    double? lat,
    double? lng,
    @JsonKey(name: 'open_time') String? openTime,
    @JsonKey(name: 'close_time') String? closeTime,
    @JsonKey(name: 'summer_only_sunday') bool? summerOnlySunday,
  }) = _Landfill;

  factory Landfill.fromJson(Map<String, dynamic> json) => _$LandfillFromJson(json);
}

/// GET /api/employee/landfill response.
@freezed
abstract class LandfillResponse with _$LandfillResponse {
  const factory LandfillResponse({
    Landfill? recommended,
    @Default(<Landfill>[]) List<Landfill> all,
    @Default(<String>[]) List<String> warnings,
    @JsonKey(name: 'day_of_week') String? dayOfWeek,
    @JsonKey(name: 'is_sunday') @Default(false) bool isSunday,
  }) = _LandfillResponse;

  factory LandfillResponse.fromJson(Map<String, dynamic> json) => _$LandfillResponseFromJson(json);
}
