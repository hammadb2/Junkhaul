import 'package:freezed_annotation/freezed_annotation.dart';

part 'receipt.freezed.dart';
part 'receipt.g.dart';

/// Receipt row from GET /api/employee/receipts.
@freezed
abstract class Receipt with _$Receipt {
  const factory Receipt({
    required String id,
    @JsonKey(name: 'assignment_id') String? assignmentId,
    @JsonKey(name: 'receipt_type') String? receiptType,
    String? vendor,
    @JsonKey(name: 'amount_cad') double? amountCad,
    @JsonKey(name: 'receipt_photo_url') String? receiptPhotoUrl,
    String? notes,
    @JsonKey(name: 'created_at') String? createdAt,
  }) = _Receipt;

  factory Receipt.fromJson(Map<String, dynamic> json) =>
      _$ReceiptFromJson(json);
}

/// GET /api/employee/receipts response.
@freezed
abstract class ReceiptsResponse with _$ReceiptsResponse {
  const factory ReceiptsResponse({
    @Default(<Receipt>[]) List<Receipt> receipts,
  }) = _ReceiptsResponse;

  factory ReceiptsResponse.fromJson(Map<String, dynamic> json) =>
      _$ReceiptsResponseFromJson(json);
}
